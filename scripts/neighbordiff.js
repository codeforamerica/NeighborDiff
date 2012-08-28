var map, building_pop, terrainLayer, satLayer, cartodb, dragtype;
var zoomLayers = [];

// CartoDB config options
var carto_user = "mapmeld";
var carto_table = "collegeplusintown";
// Your server to write to CartoDB without revealing your API key
var table_proxy = "http://maconmaps.herokuapp.com";

// prevent IE problems with console.log
if(!console || !console.log){
  console = { log: function(e){ } };
}
function init(){
  map = new L.Map('map', { zoomControl: false, panControl: false });
  L.control.pan().addTo(map);
  L.control.zoom().addTo(map);

  // set up Stamen tiles
  var toner = 'http://{s}.tile.stamen.com/terrain/{z}/{x}/{y}.png';
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
    interactivity: "cartodb_id, status, name, description",
    featureClick: function(ev, latlng, pos, data){
      //building_pop.setLatLng(latlng).setContent("Clicked a building");
      building_pop.setLatLng(latlng).setContent("<input type='hidden' id='selectedid' value='" + data.cartodb_id + "'/><label>Name</label><br/><input id='poly_name' class='x-large' value='" + replaceAll((data.name || ""),"'","\\'") + "'/><br/><label>Add Detail</label><br/><textarea id='poly_detail' rows='6' cols='25'>" + replaceAll(replaceAll((data.description || ""),"<","&lt;"),">","&gt;") + "</textarea><br/><input class='btn btn-info' onclick='saveDetail()' style='width:40%;' value='Save'/>");
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
function replaceAll(src, oldr, newr){
  while(src.indexOf(oldr) > -1){
    src = src.replace(oldr, newr);
  }
  return src;
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
  if(dragtype == "marker_NewBuilding"){
    // add a marker at the drop location
    // find latitude / longitude of drop point
    var dropPoint = map.mouseEventToLatLng(e);
    // add a marker to the visible map
    var dropMarker = new L.Marker( dropPoint );
    map.addLayer(dropMarker);
    // add a marker to a table
  }
  else{
    // fake a click to change status of building at drop point
    cartodb.interaction.screen_feature({ x: e.clientX || e.pageX, y: e.clientY || e.pageY }, function(f){
      var id = f.cartodb_id;
      dragtype = dragtype.replace("marker_", "");
      setStatus(id, dragtype);
      dragtype = null;
    });
  }
  allowDrop(e);
}
function saveDetail(){
  // save name and details from popup dialog
  var id = $('#selectedid').val();
  var name = $('#poly_name').val();
  var detail = $('#poly_detail').val();
  // make the actual call on the server, to hide API key
  $.getJSON(table_proxy + "/detailtable?table=" + carto_table + "&id=" + id + "&name=" + encodeURIComponent(name) + "&detail=" + encodeURIComponent(detail), function(data){ });
  // request the geometry of the affected building
  $.getJSON("http://" + carto_user + ".cartodb.com/api/v2/sql?format=GeoJSON&q=SELECT%20ST_AsGeoJSON(the_geom)%20FROM%20" + carto_table + "%20WHERE%20cartodb_id=" + id).done(function(poly){
    // until zoom changes and tiles are refreshed, show polygon with this name and description
    L.geoJson(JSON.parse(poly.rows[0].st_asgeojson), {
      style: function (feature) {
        // color building based on status
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
        // until the map moves, show new name and description in special popup
        layer.bindPopup("<label><em>Name: </em></label><strong>" + replaceAll(replaceAll(name,"<","&lt;"),">","&gt;") + "</strong><br/><label><em>Description: </em></label><strong>" + replaceAll(replaceAll(detail,"<","&lt;"),">","&gt;") + "</strong>");
        zoomLayers.push(layer);
      }
    }).addTo(map);
  });
  map.closePopup();
}
