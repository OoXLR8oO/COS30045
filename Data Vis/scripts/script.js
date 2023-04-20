function init() {
    // Event listener for the button
    d3.select("#toggleButton").on("click", onButtonClick);

    //barChart();
    mapVisualization(currentDataType);
    scatterPlot();
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



function scatterPlot() {
    const margin = { top: 10, right: 30, bottom: 30, left: 60 };
    const width = 460 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3
        .select("body")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().range([0, width]);
    const y = d3.scaleLinear().range([height, 0]);

    Promise.all([
        d3.csv("conflict_data.csv", d => {
            d.Fatalities = +d.Fatalities;
            return d;
        }),
        d3.csv("province_data.csv", d => {
            d['Arrival IDPs'] = +d['Arrival IDPs'];
            return d;
        }),
    ]).then(([conflictData, idpData]) => {
        x.domain([0, d3.max(conflictData, d => d.Fatalities)]);
        y.domain([0, d3.max(idpData, d => d['Arrival IDPs'])]);

        svg
            .append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x));

        svg.append("g").call(d3.axisLeft(y));

        const circles = svg
            .selectAll("circle")
            .data(conflictData)
            .join("circle")
            .attr("cx", d => x(d.Fatalities))
            .attr("cy", d => y(idpData[conflictData.indexOf(d)]['Arrival IDPs']))
            .attr("r", 3)
            .style("fill", "#69b3a2")
            .style("opacity", 0.7)
            .style("stroke", "white");

        circles
            .on("mouseover", (event, d) => {
                tooltip.transition().duration(200).style("opacity", 0.9);
                tooltip
                    .html(`Fatalities: ${d.Fatalities}<br>IDPs: ${idpData[conflictData.indexOf(d)]['Arrival IDPs']}`)
                    .style("left", `${event.pageX}px`)
                    .style("top", `${event.pageY - 28}px`);
            })
            .on("mouseout", () => {
                tooltip.transition().duration(500).style("opacity", 0);
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
                .range(d3.schemeBlues[9]);

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
                        .html(d.properties.ADM1NameEnglish + "<br>IDPs: " + (d.properties.idps || 0))
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 10) + "px");
                })
                .on("mouseout", function () {
                    // Hide tooltip on mouseout
                    d3.select("#tooltip1")
                        .style("opacity", 0);
                });
        });
    });
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

// Button click event handler
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






let currentDataType = "Arrival IDPs";
window.onload = init;







//Bar chart was shit

// function barChart() {
//     // Set up the chart dimensions and margins
//     var margin = { top: 20, right: 20, bottom: 30, left: 40 },
//         width = 960 - margin.left - margin.right,
//         height = 500 - margin.top - margin.bottom;

//     // Define the x0 scale for provinces
//     var x0 = d3.scaleBand()
//         .rangeRound([0, width])
//         .paddingInner(0.1);

//     // Define the x1 scale for categories (Arrival IDPs and Fled IDPs)
//     var x1 = d3.scaleBand()
//         .padding(0.05);

//     // Define the y scale for the number of IDPs
//     var y = d3.scaleLinear()
//         .rangeRound([height, 0]);

//     // Define the x and y axes
//     var xAxis = d3.axisBottom(x0);
//     var yAxis = d3.axisLeft(y).ticks(null, "s");

//     // Create the main SVG element and a group (g) element inside it with the proper translation
//     var svg = d3.select("#chart")
//         .append("svg")
//         .attr("width", width + margin.left + margin.right)
//         .attr("height", height + margin.top + margin.bottom)
//         .append("g")
//         .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

//     // Define the categories (Arrival IDPs and Fled IDPs)
//     var categories = ['Arrival IDPs', 'Fled IDPs'];

//     // Load and process the data
//     d3.csv("province_data.csv").then(function (data) {
//         // Set the domains for the x0, x1, and y scales
//         x0.domain(data.map(function (d) { return d.ADM1NameEnglish; }));
//         x1.domain(categories).rangeRound([0, x0.bandwidth()]);
//         y.domain([0, d3.max(data, function (d) { return Math.max(d['Arrival IDPs'], d['Fled IDPs']); })]);

//         // Add the x axis to the chart
//         svg.append("g")
//             .attr("class", "axis")
//             .attr("transform", "translate(0," + height + ")")
//             .call(xAxis);

//         // Add the y axis to the chart
//         svg.append("g")
//             .attr("class", "axis")
//             .call(yAxis)
//             .append("text")
//             .attr("transform", "rotate(-90)")
//             .attr("y", 6)
//             .attr("dy", ".71em")
//             .style("text-anchor", "end")
//             .text("IDPs");

//         // Add a group (g) element for each province, positioned according to the x0 scale
//         var province = svg.selectAll(".province")
//             .data(data)
//             .enter().append("g")
//             .attr("class", "province")
//             .attr("transform", function (d) { return "translate(" + x0(d.ADM1NameEnglish) + ",0)"; });

//         // Add a rectangle (bar) for each category (Arrival IDPs and Fled IDPs) within each province
//         province.selectAll("rect")
//             .data(function (d) { return categories.map(function (key) { return { key: key, value: d[key], province: d.ADM1NameEnglish }; }); })
//             .enter().append("rect")
//             .attr("class", "bar")
//             .attr("x", function (d) { return x1(d.key); })
//             .attr("y", function (d) { return y(d.value); })
//             .attr("width", x1.bandwidth())
//             .attr("height", function (d) { return height - y(d.value); })
//             .on("mouseover", function (event, d) {
//                 // Show tooltip on mouseover
//                 d3.select("#tooltip1")
//                     .style("opacity", 1)
//                     .html(d.province + "<br>" + d.key + ": " + d.value)
//                     .style("left", (event.pageX + 10) + "px")
//                     .style("top", (event.pageY - 10) + "px");
//             })
//             .on("mouseout", function () {
//                 // Hide tooltip on mouseout
//                 d3.select("#tooltip1")
//                     .style("opacity", 0);
//             });

//         var legend = svg.selectAll(".legend")
//             .data(categories.slice().reverse())
//             .enter().append("g")
//             .attr("class", "legend")
//             .attr("transform", function (d, i) { return "translate(0," + i * 20 + ")"; });

//         legend.append("rect")
//             .attr("x", width - 18)
//             .attr("width", 18)
//             .attr("height", 18)
//             .style("fill", function (d, i) { return i === 0 ? 'steelblue' : 'brown'; });

//         legend.append("text")
//             .attr("x", width - 24)
//             .attr("y", 9)
//             .attr("dy", ".35em")
//             .style("text-anchor", "end")
//             .text(function (d) { return d; });
//     });
// }