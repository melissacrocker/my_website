/* js by Melissa Crocker, 2020 */

//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
    
    //map frame dimensions
    var width = 960,
        height = 460;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on France
    var projection = d3.geoAlbers()
        .center([0, 33.6])
        .rotate([102.82, -8.18, 0])
        .parallels([29.5, 45.5])
        .scale(2000)
        .translate([width / 2, height / 2]);
    
    //create svg path generator using the projection
    var path = d3.geoPath()
        .projection(projection);
    
    //use queue to parallelize asynchronous data loading
    d3_queue.queue()
        .defer(d3.csv, "data/Lab2DataFinal.csv") //load attributes from csv
        .defer(d3.json, "data/Colorado_County_Boundaries.topojson") //load choropleth spatial data
        .await(callback); //trigger callback function once data is loaded

    function callback(error, csvData, colorado){
        //translate colorado TopoJSON
        var coloradoCounties = topojson.feature(colorado, colorado.objects.Colorado_County_Boundaries).features;
            
        //add Colorado counties to map
        var counties = map.selectAll(".counties")
            .data(coloradoCounties)
            .enter() //create elements
            .append("path") //append elements to svg
            .attr("class", function(d){
                return "counties " + d.properties.countyFIPS;
            })
            .attr("d", path); //project data as geometry in svg
            
        //examine the results
        
        console.log(coloradoCounties);
        console.log(map.selectAll("path").size())
    };
};