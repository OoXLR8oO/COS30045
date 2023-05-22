// The init function is called to initialize the visualizations.
// It sets up the event listeners for the button and the year selection, 
// and calls the functions to display the initial map and heatmap visualizations.
function init() {
    // Event listener for the button
    d3.select("#toggleButton").on("click", onIDPButtonClick);

    d3.select("#year").on("change", function (event) {
        var selectedYear = this.value;
        var provinceName = currentProvince;
        updateBarChart(provinceName, selectedYear);
    });

    mapVisualization(currentDataType);
    heatMap();
}

// The heatMap function creates a heatmap visualization of the conflict data.
// It reads the preprocessed conflict data from a CSV file and visualizes it as a heatmap.
function heatMap() {
    // Set up the chart dimensions
    const margin = { top: 50, right: 50, bottom: 50, left: 50 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    const info = d3.select("#heatInfo");
    const legendWidth = 500;
    const legendHeight = 20;

    const tooltip = d3.select("#tooltip3")
        .style("opacity", 0);

    // Append the SVG element to the chart container
    const svg = d3.select("#heatmap")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom + 100)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Define the scales
    const xScale = d3.scaleBand()
        .range([0, width])
        .padding(0.1);

    const yScale = d3.scaleBand()
        .range([height, 0])
        .padding(0.1);

    const colorScale = d3.scaleSequential()
        .interpolator(d3.interpolateReds);

    // Load the data
    d3.csv("preprocessed_conflict_data.csv", d => ({
        date: new Date(d.Date),
        events: isNaN(+d.Events) ? 0 : +d.Events,
        fatalities: isNaN(+d.Fatalities) ? 0 : +d.Fatalities

    })).then(data => {
        // Set the domains of the scales
        xScale.domain(data.map(d => d.date.getMonth()));
        yScale.domain(data.map(d => d.date.getFullYear()));

        const maxFatalities = d3.max(data, d => d.fatalities);
        colorScale.domain([0, maxFatalities]);

        // Draw the X axis
        svg.append("g")
            .attr("class", "axis x-axis")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale).tickFormat(d => d3.timeFormat("%B")(new Date(2000, d))));

        // Draw the Y axis
        svg.append("g")
            .attr("class", "axis y-axis")
            .call(d3.axisLeft(yScale).tickFormat(d => d));

        // Draw the cells
        svg.selectAll(".cell")
            .data(data)
            .enter()
            .append("rect")
            .attr("class", "cell")
            .attr("x", d => xScale(d.date.getMonth()))
            .attr("y", d => yScale(d.date.getFullYear()))
            .attr("width", xScale.bandwidth())
            .attr("height", yScale.bandwidth())
            .style("fill", d => colorScale(d.fatalities))
            .on("mouseover", function (event, d) {
                // Show info in the info div when hovering over a cell
                var dateFormat = d3.timeFormat("%m/%Y");
                info.html(`
                    <p>Date: ${dateFormat(d.date)}</p>
                    <p>Fatalities: ${d.fatalities}</p>
                    <p>Conflict Events: ${d.events}</p>
                `);
            })
            .on("mouseout", function () {
                // Clear the info div when no longer hovering over a cell
                info.html("");
            });

        // Draw the legend
        const legend = svg.append("g")
            .attr("transform", `translate(0,${height + 50})`);

        const defs = svg.append("defs");
        const linearGradient = defs.append("linearGradient")
            .attr("id", "linear-gradient");

        // Create an array of numbers from 0 to maxFatalities for the legend
        const legendData = Array.from({ length: maxFatalities + 1 }, (_, i) => i);

        legendData.forEach((d, i) => {
            linearGradient.append("stop")
                .attr("offset", `${100 * (i / legendData.length)}%`)
                .attr("stop-color", colorScale(d));
        });

        legend.append("rect")
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .style("fill", "url(#linear-gradient)");

        // Legend scale
        const legendScale = d3.scaleLinear()
            .range([0, legendWidth])
            .domain([0, maxFatalities]);

        const legendAxis = d3.axisBottom()
            .scale(legendScale)
            .tickSize(10);

        legend.call(legendAxis);
    });
}


// The mapVisualization function creates a map visualization of the IDP data.
// It reads the IDP data and the TopoJSON file for the map, 
// and visualizes the data on the map with different colors for different IDP types.
function mapVisualization(idpType) {
    // Clear the chart before redrawing
    d3.select("#chart").html("");

    // Set up the chart dimensions and margins
    const margin = { top: 20, right: 20, bottom: 70, left: 40 };
    const width = 960 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    // Create the main SVG element and a group (g) element inside it with the proper translation
    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom + 100)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Load and process the data
    d3.csv("province_data.csv").then(function (data) {
        const maxIDPs = d3.max(data, function (d) { return Math.max(d['Arrival IDPs'], d['Fled IDPs']); });

        // Load TopoJSON file
        d3.json("map/afghan.topojson").then(function (topology) {
            // Define the projection and path
            const projection = d3.geoMercator().fitSize([width, height], topojson.feature(topology, topology.objects.AFGADM2gbOpen));
            const path = d3.geoPath().projection(projection);

            // Define the color scale
            const colorScale = d3.scaleQuantize()
                .domain([0, maxIDPs]);
            if (idpType === 'Arrival IDPs') {
                colorScale.range(d3.schemeGreens[9]);
            } else {
                colorScale.range(d3.schemeReds[9]);
            }

            // Join the TopoJSON features with the data
            const provinces = topojson.feature(topology, topology.objects.AFGADM2gbOpen).features;
            provinces.forEach(function (d) {
                const provinceData = data.find(function (e) { return e.ADM1NameEnglish === d.properties.shapeName; });
                if (provinceData) {
                    d.properties.idps = provinceData[idpType];
                }
            });

            // Draw the map
            svg.selectAll("path")
                .data(provinces)
                .enter().append("path")
                .attr("d", path)
                .attr("fill", function (d) { return colorScale(d.properties.idps || 0); }) // Set color based on IDPs value
                .attr("stroke", "#333") // Add a border with a darker color
                .attr("stroke-width", 0.5) // Adjust the border width
                .on("mouseover", function (event, d) {
                    // Show tooltip on mouseover
                    d3.select("#tooltip1")
                        .style("opacity", 1)
                        .html(`${d.properties.shapeName}<br>IDPs: ${d.properties.idps || 0}`)
                        .style("left", `${event.pageX + 10}px`)
                        .style("top", `${event.pageY - 10}px`);
                })
                .on("click", function (event, d) {
                    // Draw the bar chart for the selected province
                    currentProvince = d.properties.shapeName;
                    updateBarChart(d.properties.shapeName, document.getElementById("year").value);
                })
                .on("mouseout", function () {
                    // Hide tooltip on mouseout
                    d3.select("#tooltip1")
                        .style("opacity", 0);
                });

            // Draw the map chart legend
            const mapLegendWidth = 500;
            const mapLegendHeight = 20;
            const mapLegendX = width - mapLegendWidth - 250;
            const mapLegendY = height - mapLegendHeight + 50; // Adjusted Y position to be below the chart

            const mapLegend = svg.append("g")
                .attr("transform", `translate(${mapLegendX}, ${mapLegendY})`);

            const mapDefs = svg.append("defs");
            const mapLinearGradient = mapDefs.append("linearGradient")
                .attr("id", "map-linear-gradient");

            const numStops = 10; // Number of color stops in the legend
            const legendData = Array.from({ length: numStops }, (_, i) => maxIDPs * (i / (numStops - 1)));

            legendData.forEach((d, i) => {
                mapLinearGradient.append("stop")
                    .attr("offset", `${100 * (i / (legendData.length - 1))}%`)
                    .attr("stop-color", colorScale(d));
            });

            mapLegend.append("rect")
                .attr("width", mapLegendWidth)
                .attr("height", mapLegendHeight)
                .style("fill", "url(#map-linear-gradient)");

            const legendScale = d3.scaleLinear()
                .range([0, mapLegendWidth])
                .domain([0, maxIDPs]);

            const legendAxis = d3.axisBottom(legendScale)
                .ticks(5)
                .tickSize(10)
                .tickFormat(d3.format(".0f"));

            mapLegend.append("g")
                .attr("class", "axis")
                .attr("transform", `translate(0, ${mapLegendHeight})`)
                .call(legendAxis);

        });
    });
}

// The updateBarChart function updates the bar chart for the selected province and year.
// It reads the IDP data, filters it for the selected province, and updates the bar chart.
function updateBarChart(provinceName, selectedYear) {
    console.log('Update chart for:', provinceName, selectedYear);
    d3.csv("idp_19_22.csv").then(function (data) {
        const filteredData = data.filter((row) => row.ADM1NameEnglish === provinceName);
        console.log('Filtered data:', filteredData);
        if (filteredData.length > 0) {
            let totalArrivalIDPs = 0;
            let totalFledIDPs = 0;


            filteredData.forEach((row) => {
                const arrivalKey = `ArrivalIDPs${selectedYear}`;
                const fledKey = `FledIDPs${selectedYear}`;

                totalArrivalIDPs += isNaN(+row[arrivalKey]) ? 0 : +row[arrivalKey];
                totalFledIDPs += isNaN(+row[fledKey]) ? 0 : +row[fledKey];
            });

            const provinceData = {
                "Arrival IDPs": totalArrivalIDPs,
                "Fled IDPs": totalFledIDPs,
            };
            console.log('Province data:', provinceData);

            drawBarChart(provinceData, provinceName, selectedYear);
        } else {
            drawBarChart(null, provinceName, selectedYear);
        }
    });
}

// The drawBarChart function draws a bar chart for the selected province and year.
// It receives the IDP data for the selected province and year, and creates the bar chart.
function drawBarChart(provinceData, provinceName, selectedYear) {
    // Remove any existing chart
    d3.select("#barchart").html("");

    // Set up the chart dimensions and margins
    var margin = { top: 30, right: 20, bottom: 30, left: 55 },
        width = 500 - margin.left - margin.right,
        height = 350 - margin.top - margin.bottom;

    // Create the SVG element and a group (g) element inside it with the proper translation
    var svg = d3.select("#barchart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    if (!provinceData) {
        // Display "No data for this province" if no data is available
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("text-anchor", "middle")
            .attr("font-size", "14px")
            .attr("font-weight", "bold")
            .text("No available data.");
        return;
    }

    var chartHeading = provinceName + " (" + selectedYear + ")";
    // Add heading with province name
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text(chartHeading);

    // Create scales for the bar chart
    var xScale = d3.scaleBand()
        .domain(["Arrival IDPs", "Fled IDPs"])
        .range([0, width])
        .padding(0.3);

    var yScale = d3.scaleLinear()
        .domain([0, Math.max(provinceData["Arrival IDPs"], provinceData["Fled IDPs"])])
        .range([height, 0]);

    // Draw the bars
    svg.selectAll(".bar")
        .data(["Arrival IDPs", "Fled IDPs"])
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", function (d) { return xScale(d); })
        .attr("y", function (d) { return yScale(provinceData[d]); })
        .attr("width", xScale.bandwidth())
        .attr("height", function (d) { return height - yScale(provinceData[d]); })
        .attr("fill", function (d) {
            if (d === "Arrival IDPs") {
                return "green";
            } else {
                return "red";
            }
        });

    // Add axis
    var xAxis = d3.axisBottom(xScale);
    var yAxis = d3.axisLeft(yScale);

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis);
}


function onIDPButtonClick() {
    var button = d3.select("#toggleButton");
    var currentText = button.text();
    if (currentText === "Show Fled IDPs") {
        mapVisualization('Fled IDPs');
        button.text("Show Arrival IDPs");
    } else {
        mapVisualization('Arrival IDPs');
        button.text("Show Fled IDPs");
    }
}

let csvData;
let currentProvince = "Kabul";
let currentDataType = "Arrival IDPs";

window.addEventListener("DOMContentLoaded", function () {
    window.onload = init;

    d3.csv("idp_19_22.csv").then(function (data) {
        csvData = data;
        var initialYear = document.getElementById("year").value;
        var provinceName = currentProvince;
        updateBarChart(provinceName, initialYear); // Call updateBarChart instead of drawBarChart directly
    });
});






