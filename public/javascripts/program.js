var width = 960,
    height = 450,
    centered;

var customerInterval = 5000;
var gameArr=[];

var projection = d3.geo.albersUsa()
    .scale(1020)
    .translate([width / 2, height / 2]);

var path = d3.geo.path()
    .projection(projection);

var svg = d3.select("#mapholder").append("svg")
    .attr("width", width)
    .attr("height", height);

svg.append("rect")
    .attr("class", "background")
    .attr("width", width)
    .attr("height", height)
    .on("click", clicked);

var g = svg.append("g");

d3.json("/us.json", function(error, us) {
    if (error) throw error;

    g.append("g")
        .attr("id", "states")
        .selectAll("path")
        .data(topojson.feature(us, us.objects.states).features)
        .enter().append("path")
        .attr("d", path)
        .on("click", clicked);

    g.append("path")
        .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
        .attr("id", "state-borders")
        .attr("d", path);
    for(var i=1;i<airports.length;i++) {
        var lat = airports[i][1];
        var lng = airports[i][2];
        g.append("circle").attr("r",5).attr("transform", function() {return "translate(" + projection([lng,lat]) + ")";});
        g.append('text').attr("transform", function() {return "translate(" + projection([lng,lat]) + ")";}).text(airports[i][5]).style("font-size","10px");
    }
    count = airports.length-1;
    var followingDay = new Date(+new Date + 86400000);
    var fortnightAway = new Date(+new Date + 12096e5/2);
    var iataCodes = airports.map((e) => e[5]);
    var ajaxArr;
    ajaxArr=[];

    for(var i=count;i>0;i--) {
        for (var j = count - 1; j > 0; j--) {
            var url= 'http://api.sandbox.amadeus.com/v1.2/flights/extensive-search?apikey=GAoGydXFLGPvtY2uMEG1a4kXhvN305bX&' +
                'origin=' + iataCodes[i] + '&destination=' + iataCodes[j] + '&departure_date=' + formattedDate(followingDay) + '--' + formattedDate(fortnightAway) +
                '&one-way=true&direct=true&aggregation_mode=DAY';
            ajaxArr.push(ajaxGet(url));
        }
    }
    ajaxArr.forEach( (prom) => {
        prom.then( (data) => {
            console.log(data);
            data = JSON.parse(data);
            var p1lat = airports[iataCodes.indexOf(data.origin)][1];
            var p1lng = airports[iataCodes.indexOf(data.origin)][2];
            for(var k=0;k<data.results.length;k++) {
                var p2lat = (airports[iataCodes.indexOf(data.results[k].destination)][1]);
                var p2lng = (airports[iataCodes.indexOf(data.results[k].destination)][2]);
                var price = (parseFloat(data.results[k].price));

                var travelObj = {
                    "from" : airports[iataCodes.indexOf(data.origin)][0],
                    "fromIATA" : data.origin,
                    "to" : airports[iataCodes.indexOf(data.results[k].destination)][0],
                    "toIATA" : data.results[k].destianation,
                    "price" : data.results[k].price
                }
                gameArr.push(travelObj);

                var lineData = [{"x": parseFloat(p1lat), "y": parseFloat(p1lng)},
                    {"x": parseFloat(p2lat), "y": parseFloat(p2lng)}];
                var geoMultiPoint = {
                    "type": "LineString",
                    "coordinates": [
                        [
                            p1lng,
                            p1lat
                        ],
                        [
                            p2lng,
                            p2lat
                        ]
                    ]
                };

                g.append("svg:defs").selectAll("marker")
                    .data(["end"])
                    .enter().append("svg:marker")
                    .attr("id", String)
                    .attr("stroke", "blue")
                    .attr("viewBox", "0 -5 10 10")
                    .attr("refX", 12)
                    .attr("refY", -0.2)
                    .attr("markerWidth", 4)
                    .attr("markerHeight", 3)
                    .attr("orient", "auto")
                    .append("svg:path")
                    .attr("d", "M0,-5L10,0L0,5");

                var dr;
                var lastRoute = g.append("path")
                    .attr("class", "routes")
                    .attr("price", price)
                    .datum(geoMultiPoint.coordinates)
                    .attr("d", function (c) {
                        var d = {
                            source: projection(c[0]),
                            target: projection(c[1])
                        };
                        var dx = d.target[0] - d.source[0],
                            dy = d.target[1] - d.source[1];
                        dr = Math.sqrt(dx * dx + dy * dy);
                        return "M" + d.source[0] + "," + d.source[1] + "A" + dr + "," + dr +
                            " 0 0,1 " + d.target[0] + "," + d.target[1];
                    })
                    .attr("stroke-width", 4)
                    .attr("stroke", "blue")
                    .attr("fill", "none")
                    .attr("marker-end", "url(#end)")
                    .on("mouseover", function (d) {
                        d3.select(this).style("stroke", "yellow");
                        coordinates = d3.mouse(this);
                        var x = coordinates[0];
                        var y = coordinates[1];
                    })
                    .on("mouseout", function (d) {
                        d3.select(this).style("stroke", "blue");
                    })
                    .on("click", function() {
                        d3.select(this).remove();
                    });
                lastRoute.append("svg:title")
                    .text(function (d) {return price;});
            }
        }).catch(err => {
            console.log("err");
        });
    });

    var customerAppear = setInterval(createCustomer, customerInterval);

});

function createCustomer() {
    $("#customers").append('<a href="#">');
}
function ajaxGet(url) {
    return new Promise(function(resolve, reject) {
        let req = new XMLHttpRequest();
        req.open("GET", url);
        req.onload = function() {
            if (req.status === 200) {
                resolve(req.response);
            } else {
                reject(new Error(req.statusText));
            }
        };

        req.onerror = function() {
            reject(new Error("Network error"));
        };

        req.send();
    });
}

function clicked(d) {
    var x, y, k;

    if (d && centered !== d) {
        var centroid = path.centroid(d);
        x = centroid[0];
        y = centroid[1];
        k = 4;
        centered = d;
    } else {
        x = width / 2;
        y = height / 2;
        k = 1;
        centered = null;
    }

    g.selectAll("path")
        .classed("active", centered && function(d) { return d === centered; });

    g.transition()
        .duration(750)
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
        .style("stroke-width", 1.5 / k + "px");
}

function formattedDate(d) {
    var month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
}