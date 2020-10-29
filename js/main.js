/* js by Melissa Crocker, 2020 */

//function to instantiate the map
$(document).ready(function() {

		var cities;	
		var map = L.map('map', { 
			center: [20, 0], 
			zoom: 2,	
			minZoom: 2
		});
       
        //add mapbox tilelayer
		 var light = L.tileLayer( 
			'https://api.mapbox.com/styles/v1/mapbox/light-v10/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoicmF2ZW5uYTkiLCJhIjoiY2tnaGN4Y3U2MDNpODJycWF0a3R4OG9wNiJ9.8g_TnO4J5iEjeQxdFEV-Eg', {
				attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>'}),
            dark = L.tileLayer(
                'https://api.mapbox.com/styles/v1/mapbox/dark-v10/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoicmF2ZW5uYTkiLCJhIjoiY2tncHo1M2RwMG9ydjJ5cDM1aXZqazh4bCJ9.yXacz8jEmzM0ZYLzFlWHmA', {
                attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>'});
			
        light.addTo(map);	

        //load the data
        $.getJSON("data/map.geojson")    
		      .done(function(data) {
			         var info = processData(data);
                    createPropSymbols(info.timestamps, data);
                    createLegend(info.min,info.max);
                    createSliderUI(info.timestamps);
	 	     })
	.fail(function() {alert("There has been a problem loading the data.")});
    
    // function to process data
    function processData(data) {
		var timestamps = [];
		var min = Infinity; 
		var max = -Infinity;

		for (var feature in data.features) {

			var properties = data.features[feature].properties; 

			for (var attribute in properties) { 

				if (attribute != 'id' &&
				  attribute != 'name' &&
				  attribute != 'lat' &&
				  attribute != 'lon') {
						
					if ($.inArray(attribute,timestamps) === -1) {
						timestamps.push(attribute);		
					}

					if (properties[attribute] < min) {	
						min = properties[attribute];
					}
						
					if (properties[attribute] > max) { 
						max = properties[attribute]; 
					}
				}
			}
		}

		return {
			timestamps : timestamps,
			min : min,
			max : max
		}
	}
    
    //function to create proportional symbols
    function createPropSymbols(timestamps, data) {
			
		cities = L.geoJson(data,{
            
            pointToLayer: function(feature, latlng) {	

			return L.circleMarker(latlng, { 
				 fillColor: "#F09494",
				 color: '#F0605D',
				 weight: 1, 
				 fillOpacity: 0.6 
				}).on({

					mouseover: function(e) {
						this.openPopup();
						this.setStyle({color: 'yellow'});
					},
					mouseout: function(e) {
						this.closePopup();
						this.setStyle({color: '#F0605D'});
							
					}
				});
			}
        }).addTo(map); 
		updatePropSymbols(timestamps[0]);
	}
    
    //function to update symbols based on timestamp
    function updatePropSymbols(timestamp) {
		
		cities.eachLayer(function(layer) {
	
			var props = layer.feature.properties;
			var radius = calcPropRadius(props[timestamp]);
			var popupContent = "<b>" + String(props[timestamp]) + 
					" million</b><br>" +
					"<i>" + props.name +
					"</i> in </i>" + 
					timestamp + "</i>";

			layer.setRadius(radius);
			layer.bindPopup(popupContent, { offset: new L.Point(0,-radius) });
		});
	}
    
    //something to do with the symbols
	function calcPropRadius(attributeValue) {

		var scaleFactor = 16;
		var area = attributeValue * scaleFactor;
		return Math.sqrt(area/Math.PI)*2;			
	}
    
    //create legend
    function createLegend(min, max) {
		 
		if (min < 5) {	
			min = 5; 
		}

		function roundNumber(inNumber) {

				return (Math.round(inNumber/5) * 5);  
		}

		var legend = L.control( { position: 'bottomleft' } );

		legend.onAdd = function(map) {

		var legendContainer = L.DomUtil.create("div", "legend");  
		var symbolsContainer = L.DomUtil.create("div", "symbolsContainer");
		var classes = [roundNumber(min), roundNumber((max-min)/2), roundNumber(max)]; 
		var legendCircle;  
		var lastRadius = 0;
		var currentRadius;
		var margin;

		L.DomEvent.addListener(legendContainer, 'mousedown', function(e) { 
			L.DomEvent.stopPropagation(e); 
		});  

		$(legendContainer).append("<h2 id='legendTitle'>People per Million</h2>");
		
		for (var i = 0; i <= classes.length-1; i++) {  

			legendCircle = L.DomUtil.create("div", "legendCircle");  
			
			currentRadius = calcPropRadius(classes[i]);
			
			margin = -currentRadius - lastRadius - 2;

			$(legendCircle).attr("style", "width: " + currentRadius*2 + 
				"px; height: " + currentRadius*2 + 
				"px; margin-left: " + margin + "px" );				
			$(legendCircle).append("<span class='legendValue'>"+classes[i]+"</span>");

			$(symbolsContainer).append(legendCircle);

			lastRadius = currentRadius;

		}

		$(legendContainer).append(symbolsContainer); 

		return legendContainer; 

		};

		legend.addTo(map);  

	} // end createLegend();
    
    // create slider
    function createSliderUI(timestamps) {
	
		var sliderControl = L.control({ position: 'bottomright'} );

		sliderControl.onAdd = function(map) {

			var slider = L.DomUtil.create("input", "range-slider");
	
			L.DomEvent.addListener(slider, 'mousedown', function(e) { 
				L.DomEvent.stopPropagation(e); 
			});

			$(slider)
				.attr({'type':'range', 
					'max': timestamps[timestamps.length-1], 
					'min': timestamps[0], 
					'step': 10,
                    'value': String(timestamps[0])})
		  		.on('input change', function() {
		  		updatePropSymbols($(this).val().toString());
                $(".temporal-legend").text(this.value);
		  	});
			return slider;
		}

		sliderControl.addTo(map)
        createTemporalLegend(timestamps[0]);
	}
    
    //create legend on slider
    function createTemporalLegend(startTimestamp) {

		var temporalLegend = L.control({position: 'bottomright' }); 

		temporalLegend.onAdd = function(map) { 
			var output = L.DomUtil.create("output", "temporal-legend");
 			$(output).text(startTimestamp)
			return output; 
		}

		temporalLegend.addTo(map); 
	}
    
    //create basemap control
    var baseMaps = {
    "Light": light,
    "Dark": dark
};
    L.control.layers(baseMaps).addTo(map);
});