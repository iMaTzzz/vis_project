const selectedCountries = new Set();

var margin = { top: 100, right: 100, bottom: 100, left: 100 },
    width = 1000 - margin.left - margin.right,
    height = 800 - margin.top - margin.bottom;

var x = d3.scaleLinear().range([0, width]);

var yAvgInc = d3.scaleLinear().range([height, 0]);
// .domain([0, 40000]); // for FR

var yGiniIndex = d3.scaleLinear().range([height, 0]).domain([0, 1]);

async function processTSVFiles() {
    const countriesData = await d3.tsv("../data/countries.tsv", (d) => ({
        code: d.code,
        name: d.name,
    }));

    const countriesMap = {};

    countriesData.forEach((d) => {
        // set (before everything else) a color to each country (according to its position in countriesData)
        countriesMap[d.code] = {name: d.name}

        const form = document.getElementById("countryForm");
        const checkboxContainer = document.createElement("div");
        checkboxContainer.id = "checkboxContainer";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.name = d.name;
        checkbox.value = d.code;

        const label = document.createElement("label");
        label.htmlFor = d.code;
        label.appendChild(document.createTextNode(d.name));

        checkboxContainer.appendChild(checkbox);
        checkboxContainer.appendChild(label);
        form.appendChild(checkboxContainer);
    });

    // Add event listeners to checkboxes inside formContainer
    const checkboxes = document.querySelectorAll("input[type='checkbox']");
    checkboxes.forEach((checkbox) => {
        checkbox.addEventListener("change", (event) => {
            console.log('---- dans event list- ---')
            const countryCode = event.target.value;
            if (event.target.checked) {
                selectedCountries.add(countryCode); // Add country code if checkbox is checked
            } else {
                selectedCountries.delete(countryCode); // Delete country code if checkbox is unchecked
            }
            updateDisplayedData();
        });
    });

    // Check the checkbox for France by default
    const franceCheckbox = document.querySelector("#checkboxContainer input[value='FR']");
    franceCheckbox.checked = true;
    selectedCountries.add("FR"); // Add France to selected countries

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

    /****** plot both lines ******/
    const LinesToShow = {
        AVG_INC: 0,
        GINI: 1,
        BOTH: 2,
    };

    const selectedLinesElem = document.getElementById("showLinesContainer");
    let selectedLines = LinesToShow.BOTH; // initialize with both lines

    selectedLinesElem.addEventListener("change", () => {
        selectedLines = selectedLinesElem.value;
        updateDisplayedData();
    });

    /****** store incomes (with corresponding year) per country in map ******/
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

    /****** store gini index (with corresponding year) per country in map ******/
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


    /**
     * function called every dynamic change to update the display
     */
    const updateDisplayedData = () => {
        const color = d3.scaleSequential(
            [0, selectedCountries.size],
            d3.interpolateRainbow
        );
        const countriesColorMap = {}
        let i = 0;
        selectedCountries.forEach((countryCode) => {
            countriesColorMap[countryCode] = color(i);
            i++;
        })
        const filtered_incAvgData = incAvgData.filter((d) =>
            selectedCountries.has(d.code)
        );

        let concatenatedIncAndGini = incAvgData.concat(giniIndexData);
        let filtered_concatenated_both_data = concatenatedIncAndGini.filter((d) =>
            selectedCountries.has(d.code)
        );

        x.domain(d3.extent(filtered_concatenated_both_data.length ? filtered_concatenated_both_data : [1900, 2000], (d) => d.year));
        // x.domain([1965, 2020]); // for FR

        yAvgInc.domain(d3.extent(filtered_incAvgData.length ? filtered_incAvgData : [0, 10000], (d) => d.average));

        // Remove the previous SVG element (if it exists)
        d3.select("svg").remove();

        let svg = d3
            .select("#svgContainer")
            .append("div")
            .style("margin-left", "20px")
            .style("margin-bottom", "20px")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // year x-axis
        let xAxis = d3.axisBottom(x).tickFormat(d3.format("d"));
        svg.append("g")
            .attr("transform", `translate(0,${yGiniIndex(0) + 5})`)
            .call(xAxis);

        // average income (left) y-axis
        if (selectedLines == LinesToShow.AVG_INC || selectedLines == LinesToShow.BOTH) {
            let yAxisLeft = d3.axisLeft(yAvgInc);
            svg.append("g").call(yAxisLeft);
        }

        let maxAbsYear = x(d3.max(filtered_concatenated_both_data.length ? filtered_concatenated_both_data : [1900, 2000], (d) => d.year));

        // gini index (right) y-axis
        if (selectedLines == LinesToShow.GINI || selectedLines == LinesToShow.BOTH) {
            let yAxisRight = d3.axisRight(yGiniIndex);
            svg.append("g")
                .attr("transform", `translate(${maxAbsYear + 5})`)
                .call(yAxisRight);
        }

        // add the 3 axis labels
        svg.append("text")
            .text("Year")
            .attr(
                "transform",
                `translate(${maxAbsYear / 2}, ${yGiniIndex(0) + 40})`
            )
            .attr("text-anchor", "end");

        if (selectedLines == LinesToShow.AVG_INC || selectedLines == LinesToShow.BOTH) {
            svg.append("text")
                .text("Average income (€)")
                .attr(
                    "transform",
                    `translate(-80, ${yGiniIndex(
                        yGiniIndex.invert(0) / 1.5
                    )}) rotate(-90)`
                )
                .attr("text-anchor", "end");
        }

        if (selectedLines == LinesToShow.GINI || selectedLines == LinesToShow.BOTH) {
            svg.append("text")
                .text("Gini index of income")
                .attr(
                    "transform",
                    `translate(${maxAbsYear + 60}, ${yGiniIndex(
                        yGiniIndex.invert(0) / 1.75
                    )}) rotate(90)`
                )
                .attr("text-anchor", "middle");
        }

        if (selectedLines == LinesToShow.AVG_INC || selectedLines == LinesToShow.BOTH) {
            Object.entries(incomesPerCountries)
            .filter(([key]) => selectedCountries.has(key))
            .forEach(([key, value]) => {
                svg.append("path")
                    .datum(value)
                    .attr("d", tsAvgInc)
                    .attr("stroke", countriesColorMap[key])
                    .attr("stroke-width", 1)
                    .attr("fill", "none");
            });
        }

        // .filter(([key, value]) => key == 'FR') // to filter only for France
        if (selectedLines == LinesToShow.GINI || selectedLines == LinesToShow.BOTH) {
            Object.entries(giniIndexPerCountries)
            .filter(([key]) => selectedCountries.has(key))
            .forEach(([key, value]) => {
                svg.append("path")
                    .datum(value)
                    .attr("d", tsGiniIndex)
                    .attr("stroke", countriesColorMap[key])
                    .attr("stroke-width", 1)
                    .attr("fill", "none")
                    .attr("stroke-dasharray", "5,5");
            });
        }

        // Add legend
        if (selectedLines == LinesToShow.BOTH) {
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
                .style("stroke-dasharray", "5, 5")
                .style("stroke", "black")
                .style("stroke-width", 2)
                .attr("x1", 150)
                .attr("y1", -5)
                .attr("x2", 180)
                .attr("y2", -5);
        }
    }

    updateDisplayedData();
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

            const checkbox = checkboxContainer.querySelector("input");
            const countryCode = checkbox.value;

            // Check if the country name contains the search text
            if (countryName.includes(searchText)) {
                checkboxContainer.style.display = "flex"; // Show checkbox
            } else {
                checkboxContainer.style.display = "none"; // Hide checkbox
            }
        });
    });
});
