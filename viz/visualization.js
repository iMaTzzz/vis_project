var margin = { top: 100, right: 100, bottom: 100, left: 100 },
    width = 1000 - margin.left - margin.right,
    height = 800 - margin.top - margin.bottom;

var x = d3.scaleLinear().range([0, width]);

var yAvgInc = d3.scaleLinear().range([height, 0]);
// .domain([0, 40000]); // for FR

var yGiniIndex = d3.scaleLinear().range([height, 0]).domain([0, 1]);

var svg = d3
    .select("#svgContainer")
    .append("div")
    .style("margin-left", "20px")
    .style("margin-bottom", "20px")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

async function processTSVFiles() {
    const countriesData = await d3.tsv("../data/countries.tsv", (d) => ({
        code: d.code,
        name: d.name,
    }));

    // one color by country
    const color = d3.scaleSequential(
        [0, countriesData.length - 1],
        d3.interpolateRainbow
    );

    const countriesMap = {};
    // set (before everything else) a color to each country (according to its position in countriesData)
    countriesData.forEach(
        (d, i) => (countriesMap[d.code] = { name: d.name, color: color(i) })
    );
    countriesData.forEach((d, i) => {
        const form = document.getElementById("countryForm");
        const checkboxContainer = document.createElement("div");
        checkboxContainer.id = "checkboxContainer";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = `country${d.code}`;
        checkbox.name = "countries[]";
        checkbox.value = d.code;

        const label = document.createElement("label");
        label.htmlFor = `country${d.code}`;
        label.appendChild(document.createTextNode(d.name));

        checkboxContainer.appendChild(checkbox);
        checkboxContainer.appendChild(label);
        checkboxContainer.appendChild(document.createElement("br"));
        form.appendChild(checkboxContainer);
    });

    console.log("countriesMap-----");
    console.log(countriesMap);

    // let selectedCountries = countriesData.map(d => d.code); // for all countries
    let selectedCountries = ["AR", "CA", "FR"]; // for only a few ones

    const giniIndexData = await d3.tsv("../data/income_gini.tsv", (d) => ({
        code: d.country,
        year: +d.year,
        gini_index: +d.gini_index,
    }));

    const incAvgData = await d3.tsv("../data/income_averages.tsv", (d) => ({
        code: d.country,
        year: +d.year,
        average: +d.average,
    }));
    const filtered_incAvgData = incAvgData.filter((d) =>
        selectedCountries.includes(d.code)
    );

    let concatenatedIncAndGini = incAvgData.concat(giniIndexData);
    let filtered_concatenated_both_data = concatenatedIncAndGini.filter((d) =>
        selectedCountries.includes(d.code)
    );

    x.domain(d3.extent(filtered_concatenated_both_data, (d) => d.year));
    // x.domain([1965, 2020]); // for FR

    yAvgInc.domain(d3.extent(filtered_incAvgData, (d) => d.average));

    // year x-axis
    var xAxis = d3.axisBottom(x).tickFormat(d3.format("d"));
    svg.append("g")
        .attr("transform", `translate(0,${yGiniIndex(0) + 5})`)
        .call(xAxis);

    // average income (left) y-axis
    var yAxis = d3.axisLeft(yAvgInc);
    svg.append("g").call(yAxis);

    let maxAbsYear = x(d3.max(filtered_concatenated_both_data, (d) => d.year));

    // gini index (right) y-axis
    var yAxis = d3.axisRight(yGiniIndex);
    svg.append("g")
        .attr("transform", `translate(${maxAbsYear + 5})`)
        .call(yAxis);

    // add the 3 axis labels
    svg.append("text")
        .text("Year")
        .attr(
            "transform",
            `translate(${maxAbsYear / 2}, ${yGiniIndex(0) + 40})`
        )
        .attr("text-anchor", "end");

    svg.append("text")
        .text("Average income (€)")
        .attr(
            "transform",
            `translate(-80, ${yAvgInc(yAvgInc.invert(0) / 1.5)}) rotate(-90)`
        )
        .attr("text-anchor", "end");

    svg.append("text")
        .text("Gini index of income")
        .attr(
            "transform",
            `translate(${maxAbsYear + 60}, ${yGiniIndex(
                yGiniIndex.invert(0) / 1.75
            )}) rotate(90)`
        )
        .attr("text-anchor", "middle");

    /****** plot both lines ******/

    /****** plot average income line ******/
    let incomesPerCountries = {};

    for (let code in countriesMap) {
        incomesPerCountries[code] = incAvgData
            .filter((d) => d.code == code)
            .map((d) => ({ year: d.year, average: d.average }));
    }

    let tsAvgInc = d3
        .line()
        .x((d) => x(d.year))
        .y((d) => yAvgInc(d.average));

    Object.entries(incomesPerCountries)
        .filter(([key]) => selectedCountries.includes(key))
        .forEach(([key, value]) => {
            svg.append("path")
                .datum(value)
                .attr("d", tsAvgInc)
                .attr("stroke", countriesMap[key].color)
                .attr("stroke-width", 1)
                .attr("fill", "none");
        });

    /****** plot gini index line ******/
    let giniIndexPerCountries = {};

    for (let code in countriesMap) {
        giniIndexPerCountries[code] = giniIndexData
            .filter((d) => d.code == code)
            .map((d) => ({ year: d.year, gini_index: d.gini_index }));
    }

    let tsGiniIndex = d3
        .line()
        .x((d) => x(d.year))
        .y((d) => yGiniIndex(d.gini_index));

    // .filter(([key, value]) => key == 'FR') // to filter only for France
    Object.entries(giniIndexPerCountries)
        .filter(([key]) => selectedCountries.includes(key))
        .forEach(([key, value]) => {
            svg.append("path")
                .datum(value)
                .attr("d", tsGiniIndex)
                .attr("stroke", countriesMap[key].color)
                .attr("stroke-width", 1)
                .attr("fill", "none")
                .attr("stroke-dasharray", "5,5");
        });

    // just for info: min and max years for average & gini tsv files
    let min = d3.min(incAvgData, (d) => d.year);
    let max = d3.max(incAvgData, (d) => d.year);
    console.log("AVERAGE--- min : ", min, " -- max: ", max);

    let min2 = d3.min(giniIndexData, (d) => d.year);
    let max2 = d3.max(giniIndexData, (d) => d.year);
    console.log("GINI--- min : ", min2, " -- max: ", max2);

    // Add legend
    const legend = svg
        .append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width / 2 - 60},${height + 75})`);

    legend.append("text").attr("x", -200).text("Average Income");

    legend
        .append("line")
        .style("stroke", "black")
        .style("stroke-width", 2)
        .attr("x1", -250)
        .attr("y1", -5)
        .attr("x2", -220)
        .attr("y2", -5);

    legend.append("text").attr("x", 200).text("Gini Index");

    legend
        .append("line")
        .style("stroke-dasharray", "3, 3")
        .style("stroke", "black")
        .style("stroke-width", 2)
        .attr("x1", 150)
        .attr("y1", -5)
        .attr("x2", 180)
        .attr("y2", -5);
}

processTSVFiles();

window.addEventListener("load", () => {
    // Filter countries based on search input
    document.getElementById("searchBar").addEventListener("input", (event) => {
        var searchText = event.target.value.toLowerCase();
        var checkboxContainers = document.querySelectorAll(
            "div#checkboxContainer"
        );
        checkboxContainers.forEach(function (checkboxContainer) {
            const label = checkboxContainer.querySelector("label");
            const countryName = label.innerText.toLowerCase();

            // Check if the country name contains the search text
            if (countryName.includes(searchText)) {
                checkboxContainer.style.display = "flex"; // Show checkbox
            } else {
                checkboxContainer.style.display = "none"; // Hide checkbox
            }
        });
    });
});