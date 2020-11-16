/* js by Melissa Crocker, 2020 */
//First line of main.js...wrap everything in a self-executing anonymous function to move to local scope
(function(){

//pseudo-global variables for data join
var attrArray = ["totCases", "totDeaths", "prctCaseDie", "prctUnins", "prctPOV"]; //list of attributes
var expressed = attrArray[0]; //initial attribute

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
        
        //add enumeration units to the map
        setEnumerationUnits(coloradoCounties, map, path);
        
        console.log(coloradoCounties);
    };
};//end of setMap()
    
function joinData(coloradoCounties, csvData){
    //loop through csv to assign each set of csv attribute values to geojson county
    for (var i=0; i<csvData.length; i++){
        var csvCounty = csvData[i]; //the current county
        var csvKey = csvCounty.countyFIPS; //the CSV primary key

        //loop through geojson counties to find correct county
        for (var a=0; a<coloradoCounties.length; a++){

            var geojsonProps = coloradoCounties[a].properties; //the current region geojson properties
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
};

function setEnumerationUnits(coloradoCounties, map, path){
    //add Colorado counties to map
    var counties = map.selectAll(".counties")
        .data(coloradoCounties)
        .enter() //create elements
        .append("path") //append elements to svg
        .attr("class", function(d){
            return "counties " + d.properties.countyFIPS;
        })
        .attr("d", path); //project data as geometry in svg
};
    
})(); //last line of main.js