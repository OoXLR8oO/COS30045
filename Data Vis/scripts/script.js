function init() {
    // Event listener for the button
    d3.select("#toggleButton").on("click", onButtonClick);

    mapVisualization(currentDataType);
    heatMap();


}

function heatMap() {
    // Set up the chart dimensions
    const margin = { top: 50, right: 50, bottom: 50, left: 50 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const tooltip = d3.select("#tooltip3")
        .style("opacity", 0);

    // Append the SVG element to the chart container
    const svg = d3.select("#heatmap")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
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
        .interpolator(d3.interpolateBlues);

    // Load the data
    d3.csv("preprocessed_conflict_data.csv", d => ({
        date: new Date(d.Date),
        fatalities: +d.Fatalities
    })).then(data => {
        // Set the domains of the scales
        xScale.domain(data.map(d => d.date.getMonth()));
        yScale.domain(data.map(d => d.date.getFullYear()));

        colorScale.domain([0, d3.max(data, d => d.fatalities)]);

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
            .on("mouseover", function (d) {
                // Show a tooltip when hovering over a cell
                tooltip.transition()
                    .duration(100)
                    .style("opacity", 0.9);
                tooltip.html(`Fatalities: ${d.fatalities}`)
                    .style("left", `${d3.event.pageX + 10}px`)
                    .style("top", `${d3.event.pageY - 30}px`);
            })
            .on("mouseout", function () {
                // Hide the tooltip when no longer hovering over a cell
                tooltip.transition()
                    .duration(100)
                    .style("opacity", 0);
            });
    });
}

function mapVisualization(idpType) {
    // Clear the chart before redrawing
    d3.select("#chart").html("");

    // Set up the chart dimensions and margins
    var margin = { top: 20, right: 20, bottom: 30, left: 40 },
        width = 960 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    // Create the main SVG element and a group (g) element inside it with the proper translation
    var svg = d3.select("#chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Load and process the data
    d3.csv("province_data.csv").then(function (data) {
        // Load TopoJSON file
        d3.json("map/afghan.topojson").then(function (topology) {
            // Define the projection and path
            var projection = d3.geoMercator().fitSize([width, height], topojson.feature(topology, topology.objects.AFGADM2gbOpen));
            var path = d3.geoPath().projection(projection);

            // Define the color scale
            var colorScale = d3.scaleQuantize()
                .domain([0, d3.max(data, function (d) { return Math.max(d['Arrival IDPs'], d['Fled IDPs']); })])
            if (idpType == 'Arrival IDPs') {
                colorScale.range(d3.schemeGreens[6]);
            }
            else {
                colorScale.range(d3.schemeReds[6]);
            }

            // Join the TopoJSON features with the data
            var provinces = topojson.feature(topology, topology.objects.AFGADM2gbOpen).features;
            provinces.forEach(function (d) {
                var provinceData = data.find(function (e) { return e.ADM1NameEnglish === d.properties.shapeName; });
                if (provinceData) {
                    d.properties.idps = provinceData[idpType];
                }
            });
            
            // Draw the map
            svg.selectAll("path")
                .data(provinces)
                .enter().append("path")
                .attr("d", path)
                .attr("fill", function (d) { return colorScale(d.properties.idps || 0); }) // Set color based on idps value
                .attr("stroke", "#333") // Add a border with a darker color
                .attr("stroke-width", 0.5) // Adjust the border width
                .on("mouseover", function (event, d) {
                    // Show tooltip on mouseover
                    d3.select("#tooltip1")
                        .style("opacity", 1)
                        .html(d.properties.shapeName + "<br>IDPs: " + (d.properties.idps || 0))
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 10) + "px");
                })
                .on("click", function (event, d) {
                    // Draw the bar chart for the selected province
                    updateChart(d.properties.shapeName, document.getElementById("year").value);
                })
                .on("mouseout", function () {
                    // Hide tooltip on mouseout
                    d3.select("#tooltip1")
                        .style("opacity", 0);
                });
        });
    });
}

function updateChart(provinceName, selectedYear) {
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
            
                console.log('Arrival Key:', arrivalKey, 'Value:', row[arrivalKey]);
                console.log('Fled Key:', fledKey, 'Value:', row[fledKey]);
            
                totalArrivalIDPs += +row[arrivalKey];
                totalFledIDPs += +row[fledKey];
            
                console.log('Total Arrival IDPs:', totalArrivalIDPs);
                console.log('Total Fled IDPs:', totalFledIDPs);
            });
            
            const provinceData = {
                "Arrival IDPs": totalArrivalIDPs,
                "Fled IDPs": totalFledIDPs,
            };
            console.log('Province data:', provinceData);
            
            drawBarChart(provinceData, provinceName);
        } else {
            drawBarChart(null, provinceName);
        }
    });
}

function drawBarChart(provinceData, provinceName) {
    // Remove any existing chart
    d3.select("#barchart").html("");

    // Set up the chart dimensions and margins
    var margin = { top: 20, right: 20, bottom: 30, left: 40 },
        width = 300 - margin.left - margin.right,
        height = 200 - margin.top - margin.bottom;

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

    // Add heading with province name
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text(provinceName);

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

function swapData() {
    if (currentDataType === "Arrival IDPs") {
        currentDataType = "Fled IDPs";
        document.getElementById("swapButton").innerText = "Swap to Arrival IDPs";
    } else {
        currentDataType = "Arrival IDPs";
        document.getElementById("swapButton").innerText = "Swap to Fled IDPs";
    }
    mapVisualization(currentDataType);
}

function onButtonClick() {
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
        updateChart(provinceName, initialYear); // Call updateChart instead of drawBarChart directly
    });
});


// Get the dropdown select element
var selectElement = document.getElementById("year");

// Add an event listener for the change event
selectElement.addEventListener("change", function(event) {
    var selectedYear = this.value;
    var provinceName = currentProvince;
    window.alert("hello");
    updateChart(provinceName, selectedYear);
});


document.getElementById("year").addEventListener("change", function () {
    var selectedYear = this.value;
    var provinceName = currentProvince;
    window.alert("hello");
    updateChart(provinceName, selectedYear);  // Call updateChart instead of drawBarChart directly
});
    
    
