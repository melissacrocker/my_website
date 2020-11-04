/* js by Melissa Crocker, 2020 */

//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
    //use queue to parallelize asynchronous data loading
    d3_queue.queue()
        .defer(d3.csv, "data/Lab2DataFinal.csv") //load attributes from csv
        .defer(d3.json, "data/Colorado_County_Boundaries.topojson") //load choropleth spatial data
        .await(callback);

    function callback(error, csvData, counties){
        //translate counties TopoJSON
        var coloradoCounties = topojson.feature(counties, counties.objects.Colorado_County_Boundaries).features;
            

        //examine the results
        console.log(coloradoCounties);
    };
};