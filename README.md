# NeighborDiff

NeighborDiff is a simple tool to update and detail geodata. We developed it to find changes a university made in their neighborhood in the 5 years since the local government collected a buildings file.

## Examples

The building highlighted below was replaced by a parking lot. Drag and drop a red marker onto it to set it to Demolished.

<img src="http://i.imgur.com/LtC9E.png"/>

<hr/>

The building under construction in the photo below is now a dormitory, and a journalism school is being built across the street. Drag and drop a green marker where new buildings should be added.

<img src="http://i.imgur.com/iNxUD.png"/>

In the future, NeighborDiff will let you add more names and information when you click on a building.

The output data can be added to OpenStreetMap with this site as proof of community review.

## About CartoDB

The buildings in NeighborDiff are stored on CartoDB. We use their Maps API to display and interact with the buildings, and their Node.js module + SQL API to change the status of buildings as you edit them.

<a href="http://cartodb.com">CartoDB</a> is a free/freemium mapping database from Vizzuality. You can upload shapefiles and Google Earth KML data to start creating a table.

## Other technologies used

Leaflet.js from Cloudmade, Wax from MapBox

## Hosting on GitHub Pages