var map, building_pop, terrainLayer, satLayer, cartodb, dragtype;
var zoomLayers = [];

// CartoDB config options
var table_proxy = "http://maconmaps.herokuapp.com";
var carto_user = "mapmeld";
var carto_table = "collegeplusintown";

// prevent IE problems with console.log
if(!console || !console.log){
  console = { log: function(e){ } };
}
function init(){
  map = new L.Map('map');

  // set up Stamen tiles
  var toner = 'http://{s}.tile.stamen.com/terrain-lines/{z}/{x}/{y}.png';
  var tonerAttrib = 'Map data &copy; 2012 OpenStreetMap contributors, Tiles &copy; 2012 Stamen Design';
  terrainLayer = new L.TileLayer(toner, {maxZoom: 18, attribution: tonerAttrib});
  map.addLayer(terrainLayer);
  map.setView(new L.LatLng(32.831788, -83.648228), 17);
  
  // add Bing Aerial maps tiles
  satLayer = new L.BingLayer("Arc0Uekwc6xUCJJgDA6Kv__AL_rvEh4Hcpj4nkyUmGTIx-SxMd52PPmsqKbvI_ce");  
  map.addLayer(satLayer);
  satLayer.setOpacity(0);
  
  // optional building popup
  building_pop = new L.Popup();
  
  // add CartoDB tiles and UTFGrid layer
  cartodb = new L.CartoDBLayer({
    map: map,
    user_name: carto_user,
    table_name: carto_table,
    query: "SELECT * FROM " + carto_table,
    // use Carto to set a style
    tile_style: carto_table + "{polygon-fill:orange;polygon-opacity:0.3;} " + carto_table + "[status='Demolished']{polygon-fill:red;} " + carto_table + "[status='Renovated']{polygon-fill:green;} " + carto_table + "[status='Moved']{polygon-fill:blue;}",
    interactivity: "cartodb_id, status",
    featureClick: function(ev, latlng, pos, data){
      building_pop.setLatLng(latlng).setContent("Clicked a building");
      map.openPopup(building_pop);
    },
    //featureOver: function(){},
    //featureOut: function(){},
    auto_bound: false
  });
  map.addLayer(cartodb);
  
  // whenever you zoom the map, tiles are updated, so temporary polygons are no longer needed
  map.on('zoomend', function(e){
    for(var i=0;i<zoomLayers.length;i++){
      map.removeLayer(zoomLayers[i]);
    }
    zoomLayers = [];
  });
}
function setMap(lyr){
  // switching between Stamen and Bing layers
  if(lyr == "street"){
    terrainLayer.setOpacity(1);
    satLayer.setOpacity(0);
    $("#streetlayer").addClass("active");
    $("#satlayer").removeClass("active");
  }
  else if(lyr == "sat"){
    terrainLayer.setOpacity(0);
    satLayer.setOpacity(1);
    $("#streetlayer").removeClass("active");
    $("#satlayer").addClass("active");
  }
}
function setStatus(id, status){
  // write the new status of the building using CartoDB's SQL API
  // do that on the server side, to keep your API key secret
  $.getJSON(table_proxy + "/changetable?id=" + id + "&status=" + status, function(data){ });
  
  // get GeoJSON of the building footprint and temporarily highlight it with the appropriate color
  // after the user moves the map, tiles will be updated and these polygons can be removed
  $.getJSON("http://" + carto_user + ".cartodb.com/api/v2/sql?format=GeoJSON&q=SELECT%20ST_AsGeoJSON(the_geom)%20FROM%20" + carto_table + "%20WHERE%20cartodb_id=" + id).done(function(poly){
    L.geoJson(JSON.parse(poly.rows[0].st_asgeojson), {
      style: function(feature){
        if(status == "Demolished"){
          return {color: "#f00", opacity: 1};
        }
        else if(status == "Renovated"){
          return {color: "#0f0", opacity: 1};
        }
        else if(status == "Moved"){
          return {color: "#00f", opacity: 1};      
        }
        else{
          return {color: "orange", opacity: 1};
        }
      },
      onEachFeature: function(feature, layer){
        // register these temporary polygons
        zoomLayers.push(layer);
        // optional: add a message for when you click a building
        layer.bindPopup("You changed this.<br/>Zoom map to update tiles.");
      }
    }).addTo(map);
  });
}
// drag and drop code and events tested in Firefox and Chrome
function dragstarted(e){
  dragtype = e.target.id;
}
function allowDrop(e){
  e.preventDefault();
}
function dragended(e){
  allowDrop(e);
}
function dropped(e){
  // fake a click to change status of building at drop point
  cartodb.interaction.screen_feature({ x: e.clientX || e.pageX, y: e.clientY || e.pageY }, function(f){
    var id = f.cartodb_id;
    dragtype = dragtype.replace("marker_", "");
    setStatus(id, dragtype);
    dragtype = null;
  });
  allowDrop(e);
}