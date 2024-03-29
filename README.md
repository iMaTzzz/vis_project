# Project made by Maria Stella Villa Avila, Hugo Demeyere and Matteo Sciascia

# 2019-wid

Extracts of the [World Inequality Database](https://wid.world/).

## Content

* **data/** the data in [tsv](https://bl.ocks.org/mbostock/3305937).
	* **countries.tsv** country codes
	* **income_gini.tsv** [GINI index](https://en.wikipedia.org/wiki/Gini_coefficient) of income per country and year
	* **income_averages.tsv** income average per country and year (constant 2015 euro)
	* **income/** income share per country
* **viz/** sample visualisations
* **vendor/** vendorized d3 library

## Data structure

Income data table are given per country.
The attributes present in the tables are:

* **country** the country code
* **year** the year for the data
* **low** the lower bound of the population quantile (from 0. to 1.)
* **high** the upper bound of the population quantile (from 0. to 1.)
* **width** the width of the quntile (high-low)
* **share** the share of the total income captured by this [low, high] quantile
* **cumul** the cumulative share of the quantiles, i.e. the share of [0., high]

## Main visualization
* **main.html**: Trends in income inequality: Average income and Wealth Distribution Comparison
