/* js by Melissa Crocker, 2020 */
//First line of main.js...wrap everything in a self-executing anonymous function to move to local scope
(function(){

    //pseudo-global variables for data join
    var attrArray = ["totCases", "totDeaths", "NUM_Unins", "EST_TOT_PV", "MEDI_INC"]; //list of attributes
    var expressed = attrArray[0]; //initial attribute

    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 473,
        leftPadding = 25,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    //create a scale to size bars proportionally to frame and for axis
    var yScale = d3.scaleLinear()
        .range([463, 0])
        .domain([0, 110]);
    
    //begin script when window loads
    window.onload = setMap();

    //set up choropleth map
    function setMap(){
    
        //map frame dimensions
        var width = window.innerWidth * 0.5,
            height = 460;

        //create new svg container for the map
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

        //create Behrmann equal area cylindrical projection centered on Colorado
        var projection = d3.geoCylindricalEqualArea()
            .center([0, 33.6])
            .rotate([105.5, -5.25, 0])
            .parallel([30])
            .scale(5500)
            .translate([width / 2, height / 2]);
    
        //create svg path generator using the projection
        var path = d3.geoPath()
            .projection(projection);
    
        //use queue to parallelize asynchronous data loading
        d3_queue.queue()
            .defer(d3.csv, "data/Lab2DataFinal.csv") //load attributes from csv
            .defer(d3.json, "data/US_State_Boundaries.topojson") //load background spatial data
            .defer(d3.json, "data/Colorado_County_Boundaries.topojson") //load choropleth spatial data
            .await(callback); //trigger callback function once data is loaded

        //callback
        function callback(error, csvData, us, colorado){
            
            //translate us Topojson
            var usStates = topojson.feature(us, us.objects.US_State_Boundaries),
                //translate colorado TopoJSON
                coloradoCounties = topojson.feature(colorado, colorado.objects.Colorado_County_Boundaries).features;
            
            //add US states to map
            var states = map.append("path")
                .datum(usStates)
                .attr("class", "states")
                .attr("d", path);
        
            //join csv data to GeoJSON enumeration units
            coloradoCounties = joinData(coloradoCounties, csvData);
        
            //create the color scale
            var colorScale = makeColorScale(csvData);
        
            //add enumeration units to the map
            setEnumerationUnits(coloradoCounties, map, path, colorScale);
        
            //add coordinated visualization to the map
            setChart(csvData, colorScale);
        
            //add dropdown to the map
            createDropdown(csvData);
        };//end of callback
    };//end of setMap()
    
    //joins data
    function joinData(coloradoCounties, csvData){
        
        //loop through csv to assign each set of csv attribute values to geojson county
        for (var i=0; i<csvData.length; i++){
            var csvCounty = csvData[i]; //the current county
            var csvKey = csvCounty.countyFIPS; //the CSV primary key

            //loop through geojson counties to find correct county
            for (var a=0; a<coloradoCounties.length; a++){

                var geojsonProps = coloradoCounties[a].properties; //the current county geojson properties
                var geojsonKey = geojsonProps.countyFIPS; //the geojson primary key

                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey){

                    //assign all attributes and values
                    attrArray.forEach(function(attr){
                        var val = parseFloat(csvCounty[attr]); //get csv attribute value
                        geojsonProps[attr] = val; //assign attribute and value to geojson properties
                    });
                };
            };
        };

        return coloradoCounties;
    };//end of joinData()
    
    // set enumeration units
    function setEnumerationUnits(coloradoCounties, map, path, colorScale){
        //add Colorado counties to map
        var counties = map.selectAll(".counties")
            .data(coloradoCounties)
            .enter() //create elements
            .append("path") //append elements to svg
            .attr("class", function(d){
                return "counties " + d.properties.countyFIPS;
            })
            .attr("d", path) //project data as geometry in svg
            .style("fill", function(d){
                return choropleth(d.properties, colorScale);
            });
    };//end of setEnumerationUnits()
    
    //function to create color scale generator
    function makeColorScale(csvData){
        var colorClasses = [
            "#fee5d9",
            "#fcae91",
            "#fb6a4a",
            "#de2d26",
            "#a50f15"
        ];

        //create color scale generator
        var colorScale = d3.scaleThreshold()
            .range(colorClasses);

        //build array of all values of the expressed attribute
        var domainArray = [];
        for (var i=0; i<csvData.length; i++){
            var val = parseFloat(csvData[i][expressed]);
            domainArray.push(val);
        };

        //cluster data using ckmeans clustering algorithm to create natural breaks
        var clusters = ss.ckmeans(domainArray, 5);
        
        //reset domain array to cluster minimums
        domainArray = clusters.map(function(d){
            return d3.min(d);
        });
        
        //remove first value from domain array to create class breakpoints
        domainArray.shift();

        //assign array of last 4 cluster minimums as domain
        colorScale.domain(domainArray);

        return colorScale;
    }; //end of makeColorScale()
    
    //function to test for data value and return color
    function choropleth(props, colorScale){
        
        //make sure attribute value is a number
        var val = parseFloat(props[expressed]);
        
        //if attribute value exists, assign a color; otherwise assign gray
        if (typeof val == 'number' && !isNaN(val)){
            return colorScale(val);
        } else {
            return "#CCC";
        };
    };//end choropleth()
    
    //function to create coordinated bar chart
    function setChart(csvData, colorScale){

        //create a second svg element to hold the bar chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

        //create a rectangle for chart background fill
        var chartBackground = chart.append("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);

        //create a scale to size bars proportionally to frame and for axis
        var yScale = d3.scaleLinear()
            .range([463, 0])
            .domain([0, 20000]);

        //set bars for each county
        var bars = chart.selectAll(".bar")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function(a, b){
                return b[expressed]-a[expressed]
            })
            .attr("class", function(d){
                return "bar " + d.countyFIPS;
            })
            .attr("width", chartInnerWidth / csvData.length - 1)

        //create a text element for the chart title
        var chartTitle = chart.append("text")
            .attr("x", 40)
            .attr("y", 40)
            .attr("class", "chartTitle")

        //create vertical axis generator
        var yAxis = d3.axisLeft()
            .scale(yScale);

        //place axis
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);

        //create frame for chart border
        var chartFrame = chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);
    
        //set bar positions, heights, and colors
        updateChart(bars, csvData.length, colorScale);
    
    };//end of setChart()
    
    //function to create a dropdown menu for attribute selection
    function createDropdown(csvData){
        //add select element
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function(){
                changeAttribute(this.value, csvData)
            });
    
        //add initial option
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Attribute");

        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function(d){ return d })
            .text(function(d){ return d });
    };//end of createDropdown()
    
    //dropdown change listener handler
    function changeAttribute(attribute, csvData){
        
        //change the expressed attribute
        expressed = attribute;

        //recreate the color scale
        var colorScale = makeColorScale(csvData);

        //recolor enumeration units
        var counties = d3.selectAll(".counties")
            .transition()
            .duration(1000)
            .style("fill", function(d){
                return choropleth(d.properties, colorScale)
            });
        
        //re-sort, resize, and recolor bars
        var bars = d3.selectAll(".bar")
        
            //re-sort bars
            .sort(function(a, b){
                return b[expressed] - a[expressed];
            })
            .transition() //add animation
            .delay(function(d, i){
                return i * 20
            })
            .duration(500);
        
        updateChart(bars, csvData.length, colorScale);
    
    };//end of changeAttribute()
    
    //function to position, size, and color bars in chart
    function updateChart(bars, n, colorScale){
        
        //position bars
        bars.attr("x", function(d, i){
                return i * (chartInnerWidth / n) + leftPadding;
            })
        
            //size/resize bars
            .attr("height", function(d, i){
                return 463 - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function(d, i){
                return yScale(parseFloat(d[expressed])) + topBottomPadding;
            })
        
            //color/recolor bars
            .style("fill", function(d){
                return choropleth(d, colorScale);
            })
        
        var chartTitle = d3.select(".chartTitle")
            .text("Number of " + expressed + " in each county");
    };//end updateChart()
})(); //last line of main.js