var width = 960,
    height = 450,
    centered;

var potentMoney=0;
var ajaxCount=0;
var gameArr=[];
var numWaitingCustomers=0;
var totalCustomersArrived=0;
var selectedCustomer={
    "start":'',
    "finish":'',
    "id":''};
var totalMoney=0;
var constructedPath=[];
var routePath=[];

var projection = d3.geo.albersUsa()
    .scale(1010)
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

    count = airports.length-1;
    var followingDay = new Date(+new Date + 86400000);
    var fortnightAway = new Date(+new Date + 12096e5/9);
    var iataCodes = airports.map((e) => e[5]);
    var ajaxArr;
    ajaxArr=[];

    for(var i=count;i>0;i--) {
        for (var j = count - 1; j > 0; j--) {
            var url= 'http://api.sandbox.amadeus.com/v1.2/flights/extensive-search?apikey=g458Iku08iiVSNbipX71LH1GdsSL2KJq&' +
                'origin=' + iataCodes[i] + '&destination=' + iataCodes[j] + '&departure_date=' + formattedDate(followingDay) + '--' + formattedDate(fortnightAway) +
                '&one-way=true&direct=true&aggregation_mode=DAY';
            ajaxArr.push(ajaxGet(url));
        }
    }
    ajaxCount=0;
    ajaxArr.forEach( (prom) => {
        prom.then( (data) => {
            if(++ajaxCount === 20) startGame();
            //console.log(data);
            data = JSON.parse(data);
            var p1lat = airports[iataCodes.indexOf(data.origin)][1];
            var p1lng = airports[iataCodes.indexOf(data.origin)][2];
            for(var k=0;k<data.results.length;k++) {
                var p2lat = (airports[iataCodes.indexOf(data.results[k].destination)][1]);
                var p2lng = (airports[iataCodes.indexOf(data.results[k].destination)][2]);
                var price = (parseFloat(data.results[k].price));
                var travelObj= new Object();
                travelObj= {
                    "from" : airports[iataCodes.indexOf(data.origin)][0],
                    "fromID" : airports[iataCodes.indexOf(data.origin)][9],
                    "fromIATA" : data.origin,
                    "to" : airports[iataCodes.indexOf(data.results[k].destination)][0],
                    "toID" : airports[iataCodes.indexOf(data.results[k].destination)][9],
                    "toIATA" : data.results[k].destination,
                    "price" : data.results[k].price
                };
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
                    .attr("sourceNode", travelObj.fromIATA)
                    .attr("destNode",travelObj.toIATA)
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
                    .attr("stroke-width", 3)
                    .attr("stroke", "blue")
                    .attr("fill", "none")
                    .attr("marker-end", "url(#end)")
                    .on("mouseover", function (d) {
                        //d3.select(this).style("stroke", "yellow");
                        coordinates = d3.mouse(this);
                        var x = coordinates[0];
                        var y = coordinates[1];
                    })
                    .on("click", function() {
                        var currRoute = d3.select(this);
                        if(selectedCustomer.id!=='') {
                            if(constructedPath.length===0 && currRoute.attr("sourceNode")===selectedCustomer.start) { //We are at initial stage
                                constructedPath[0]=currRoute.attr("sourceNode");
                                constructedPath[1]=currRoute.attr("destNode");
                                potentMoney=parseFloat(currRoute.attr("price"));
                                d3.selectAll(".routes").style("stroke","blue");
                                currRoute.style("stroke","yellow");
                                routePath=[];
                                routePath.push(currRoute);

                            } else {
                                if(constructedPath[1]===currRoute.attr("sourceNode")) {
                                    routePath.push(currRoute);
                                    constructedPath[1] = currRoute.attr("destNode");
                                    d3.selectAll(".routes").style("stroke", "blue");

                                    for (var riroute of routePath) {
                                        riroute.style("stroke", "yellow");
                                    }
                                    potentMoney+=parseFloat(currRoute.attr("price"));
                                }
                            }
                            if(constructedPath.indexOf(selectedCustomer.finish) >=0) {
                                console.info("REACHEEEED");
                                totalMoney+=potentMoney;
                                //console.info(totalMoney);
                                for(var riroute of routePath) {
                                    riroute.remove();
                                }
                                $('#'+selectedCustomer.id).remove();
                                document.getElementById("money").innerHTML=totalMoney;
                                selectedCustomer.id='';
                                constructedPath=[];
                                routePath=[];
                                potentMoney=0;
                            }


                        }
                    });
                lastRoute.append("svg:title")
                    .text(function (d) {return price;});
            }

        }).catch( (err) => {
            if(++ajaxCount===20) startGame();
        });
    });


});

function startGame() {
    console.log("heeee");
    for(var i=1;i<airports.length;i++) {
        var lat = airports[i][1];
        var lng = airports[i][2];
        g.append("circle").attr("r",5).attr("transform", function() {return "translate(" + projection([lng,lat]) + ")";});
        g.append('text').attr("transform", function() {return "translate(" + projection([lng,lat+20]) + ")";}).text(airports[i][5]).style("font-size","30px").style("fill","black");
    }
    var customerInterval = 2000;
    var timer = setInterval(createCustomer,customerInterval);
    var gv = setInterval(gameOver,1000);
}

function gameOver() {
        timercount=parseInt( document.getElementById("countdown").innerHTML);
        console.info(timercount);
        timercount--;
        document.getElementById("countdown").innerHTML=timercount;
        if (timercount <= 0) {
            clearInterval(timer);
            clearInterval(gv);
            alert("game over");
            return;
        }

}

function createCustomer() {
    var jprice=1;
    var loop=true;
        var sourcef = Math.floor((Math.random() * (airports.length-1)));
        var destf =Math.floor((Math.random() * (airports.length-1)));
        var test = checkConn(sourcef)[destf];
        if(test.distance===0 || test.distance===null) return;
        else {
            numWaitingCustomers++;
            totalCustomersArrived++;
            var newid= airports[sourcef+1][5]+ airports[destf+1][5] + totalCustomersArrived;
            $("#customers").append('<p id='+""+newid+'>Take me from '
                + airports[sourcef+1][0]+' to '+ airports[destf+1][0] +' with less than ' + test.distance *1000+'</p>');
            $('#'+newid).click(function() {
                $('p').removeClass('bluecolor');
                $(this).addClass('bluecolor');
                selectedCustomer.start=airports[sourcef+1][5];
                selectedCustomer.finish=airports[destf+1][5];
                selectedCustomer.id=newid;
                constructedPath=[];
                routePath=[];
                potentMoney=0;
                d3.selectAll(".routes").style("stroke","blue");
            });
        }
}

function checkConn(node) {
    var adjList=[];
    for(var ti=1;ti<airports.length;ti++) adjList.push([]);
    for(var t=0;t<gameArr.length;t++) {
        var gindFrom = parseInt(gameArr[t].fromID);
        var gindTo = parseInt(gameArr[t].toID);
        if(adjList[gindFrom]!==undefined)
            if(adjList[gindFrom].indexOf(gindTo) < 0) adjList[gindFrom].push(gindTo);
    }
    var infoBFS =  doBFS(adjList,node);
    return infoBFS;
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
            //reject(new Error("Network error"));
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

//Copied from https://www.khanacademy.org/computing/computer-science/algorithms/breadth-first-search/p/challenge-implement-breadth-first-search
//Also used : https://gist.github.com/byt3smith/1885e65a2d14307391d33a566b7faf9f
/* A Queue object for queue-like functionality over JavaScript arrays. */
var Queue = function() {
    this.items = [];
};
Queue.prototype.enqueue = function(obj) {
    this.items.push(obj);
};
Queue.prototype.dequeue = function() {
    return this.items.shift();
};
Queue.prototype.isEmpty = function() {
    return this.items.length === 0;
};

/*
 * Performs a breadth-first search on a graph
 * @param {array} graph - Graph, represented as adjacency lists.
 * @param {number} source - The index of the source vertex.
 * @returns {array} Array of objects describing each vertex, like
 *     [{distance: _, predecessor: _ }]
 */
var doBFS = function(graph, source) {
    var bfsInfo = [];

    // initialize all cells -> {description:null, predecessor:null}
    for (var i = 0; i < graph.length; i++) {
        bfsInfo[i] = {
            distance: null,
            predecessor: null };
    }

    // set source to 0 distance with null predecessor
    bfsInfo[source].distance = 0;

    var queue = new Queue();
    queue.enqueue(source);

    // Traverse the graph
    // As long as the queue is not empty:
    //  Repeatedly dequeue a vertex u from the queue.
    //
    //  For each neighbor v of u that has not been visited:
    //     Set distance to 1 greater than u's distance
    //     Set predecessor to u
    //     Enqueue v
    //
    //  Hint:
    //  use graph to get the neighbors,
    //  use bfsInfo for distances and predecessors

    while (!queue.isEmpty()) {
        // pop queue item into vertex variable
        var vertex = queue.dequeue();

        // iterate through vertex subarray in graph
        for (var u = 0; u < graph[vertex].length; u++) {
            // set neighbor var to be the current index iteration
            var neighbor = graph[vertex][u];

            // check if neighbor has been visited
            if (bfsInfo[neighbor].distance === null) {
                // add 1 to the distance of current vertex, then set for neighbor
                bfsInfo[neighbor].distance = bfsInfo[vertex].distance+1;
                // origin for the current vertex
                bfsInfo[neighbor].predecessor = vertex;
                queue.enqueue(neighbor);
            }
        }
    }

    return bfsInfo;
};
