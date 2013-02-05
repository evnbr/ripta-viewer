function Map(el) {

  var self = this;

	// Layers
	// ------

	   var map = d3.select(el),
  shapeLayer = map.select(".shapes"),
	 stopLayer = map.select(".stops"),
    busLayer = map.select(".buses");

	// Scale
	// -----

  var yScale, xScale;
  setupScales();

  // Dragging
  // --------

  // // drag x-axis logic
  // this.downx = Math.NaN;

  // // drag y-axis logic
  // this.downy = Math.NaN;

  // this.dragged = this.selected = null;

  // // pointer events
  // map
  //   .attr("pointer-events", "all")
  //   .on("mousedown.drag", self.plot_drag())
  //   .on("touchstart.drag", self.plot_drag())
  //   this.plot.call(d3.behavior.zoom().x(this.x).y(this.y).on("zoom", this.redraw()));

  // d3.select(this.chart)
  //   .on("mousemove.drag", self.mousemove())
  //   .on("touchmove.drag", self.mousemove())
  //   .on("mouseup.drag",   self.mouseup())
  //   .on("touchend.drag",  self.mouseup());

  // Components
  // ----------

  var panzoom = new PanZoomControl(el),
  stopControl = new StopControl(),
 shapeControl = new ShapeControl(),
  tripControl = new TripControl(),
  timeControl = new TimeControl();

  this.shapeControl = shapeControl;

  shapeControl.create();

  this.makeStops = function(){
  	stopControl.create(stops);
  	stopControl.show();
  }

  this.makeBus = function(time){
    tripControl.set(time);
  }

	// Stops
	// -----

	function StopControl() {
    var loaded = false;
    var visible = false;

    // Constructor
    // -----------
    bindEvents();

    // Public methods
    // --------------

    this.create = create;
    this.refresh = refresh;
    this.show = show;
    this.hide = hide;
    this.toggle = toggle;

    // Private methods
    // ---------------
    function bindEvents() {
      $("#stopCheck").change(function(e) {
        if (!loaded) create(stops);
        else toggle();
      });
    }

    function create(data) {
      visible = true;
      loaded = true;
	    stopLayer.selectAll(".stop")
	      .data(data)
	      .enter()
	      .append("circle")
	      .attr("class", "stop")
        .attr("id", function(d) { return parseInt(d.id, 10) })
	      .attr("cx", function(d) { return xScale(d.lon)    })
	      .attr("cy", function(d) { return yScale(d.lat)    });
        //.attr("title", function(d) { return d.name } )
      show();
	  }

	  function refresh() {
	    stopLayer.selectAll(".stop")
	      .attr("cx", function(d) { return xScale(d.lon) })
	      .attr("cy", function(d) { return yScale(d.lat) });
    }

    function hide(){
      visible = false;
      stopLayer.selectAll(".stop")
        .transition()
        .delay(function(d, i) { return i; })
        .attr("r",0);
    }

    function show(){
      visible = true;
      stopLayer.selectAll(".stop")
        .transition()
        .delay(function(d, i) { return i; })
        .attr("r",1);
	  }
    function toggle(){
      if (visible) hide();
      else show();
    }
	}

	// Shapes
	// ------

	function ShapeControl() {
    var visible = true,
    smoothStart = 0.002,
     smoothness = smoothStart;
    // Constructor
    // -----------
    bindEvents();

    // Public methods
    // --------------

    this.hide = hide;
    this.show = show;
	  this.create = create;
    this.setSmooth = setSmooth;
	  this.refresh = refresh;

    // Private methods
    // ---------------

    function create() {
      // console.log(smoothness);

      // Array of shape points only because d3 is picky
      var simplifiedShapes = shapes.map( function(s) {
        return simplify(s.pt,smoothness); });

      // Array of shape ids only to lookup simplifiedShapes
      var shapeIds = shapes.map( function(s) { return s.id; });

      // Apply new data
      var shapedata = shapeLayer.selectAll(".line")
        .data(simplifiedShapes)

      // Redraw existing lines
      refresh();

      // Add new lines
      shapedata.enter()
        .append("svg:path")
        .attr("id", function(d, i) { return "l"+shapeIds[i] })  
        .attr("stroke", "black")
        .attr("stroke-width", "1")
        .attr("class", "line")
        .attr("d", pathMaker);
    }

    function refresh() {
      shapeLayer.selectAll(".line")
        .attr("d", pathMaker)
    }

    function setSmooth(s) {
      smoothness = s * smoothStart;
      create();
    }

    function bindEvents() {
      $("#shapeCheck").change(function(e) {
        if (visible) hide();
        else show();
      });
    }

    function hide() {
      visible = false;
      shapeLayer.selectAll(".line")
        .attr("stroke-width", "0")
    }

    function show() {
      visible = true;
      shapeLayer.selectAll(".line")
        .attr("stroke-width", "1")
    }

	  var pathMaker = d3.svg.line()
	  	.y(function(d) { return yScale(d.y) })
	  	.x(function(d) { return xScale(d.x) })
	  	.interpolate("basis"); // "basis" for smoother
	}

	// Trips
	// -----

	function TripControl() {

    // Public methods
    // --------------

    this.set = function(time) {
      displayBus(time);
      var hr = parseInt(time / 60);
      var mi = parseInt(time % 60);
      var ap = "am";
      if (hr >= 12) {
        hr -= 12;
        ap = "pm";
      }
      if (mi < 10) mi = "0"+mi;
      $("#timestamp").html(hr+":"+mi+""+ap);
    }

    this.refresh = updatePos;

    // Private methods
    // ---------------

    function updatePos() {
      busLayer.selectAll(".bus").select("rect")
        .attr("transform",
          function(d) {
            return "translate("+xScale(d.x)+","+yScale(d.y)+") rotate("+d.a+")"; });

      // busLayer.selectAll(".bus").select("text")
      //     .attr("x", function(d) { return xScale(d.x) })
      //     .attr("y", function(d) { return yScale(d.y) });

      refreshInterps();      // DEBUG
    }

    function displayBus(time) {
      var currentBus = getData(time);

      // Main
      // ----
      var bus = busLayer
        .selectAll(".bus")
        .data(currentBus, function(d) { return d.id; });

      // Move existing buses
      // -------------------
      updatePos();

      // Add new buses
      // -------------
      var busEnter = bus.enter().append("g").attr("class", "bus");
          busEnter.append("rect")
              .attr("x", 0)
              .attr("y", 0)
              .attr("transform",
                function(d) {
                  return "translate("+xScale(d.x)+","+yScale(d.y)+") rotate("+d.a+")"; })
              .attr("height", 0)
              .attr("width", 0)
              .attr("fill", "lime")
              .transition()
                .attr("height", 3)
                .attr("width", 6)
              .transition()
                .attr("fill", "blue");
          // busEnter.append("text")
          //     .text(function(d) { return d.id })
          //     .attr("fill", "blue")
          //     .attr("x", function(d) { return xScale(d.x) })
          //     .attr("y", function(d) { return yScale(d.y) })

      // Remove old buses
      // ---------------
      var busExit = bus.exit();
          busExit.select("rect")
            .transition()
              .attr("fill", "red")
            .transition()
              .attr("width",0)
              .attr("height",0)
            .remove();

          busExit.remove();

      // Force-labels
      // -----------------

      bus.call(labelForce.update);

      labels = map.selectAll(".labels").data(currentBus,function(d) { return d.id})
          labels.exit().attr("class","exit").transition().delay(0).duration(500).style("opacity",0).remove()
          
          // Draw the labelbox, caption and the link
              newLabels = labels.enter().append("g").attr("class","labels")

              newLabelBox = newLabels.append("g").attr("class","labelbox")
                      newLabelBox.append("circle").attr("r",11)
                      newLabelBox.append("text").attr("class","labeltext").attr("y",6)
              newLabels.append("line").attr("class","link")
              
              labelBox = map.selectAll(".labels").selectAll(".labelbox")
              links = map.selectAll(".link")
              labelBox.selectAll("text").text(function(d) { return d.route})



    }

    function getData(time) {
      currentBus = [];
      currentStopInterps = [];
      trips.forEach(function(trip){
        if (trip.stop && trip.stop.length > 0){
          var interp = interpolateBus(trip.stop, trip.shape, time);
          if (interp == -1) {
            //console.log("not active");
            return;
          }
          else { // bus is running right now
            var bus = { sign: trip.sign,
                       shape: trip.shape,
                       route: trip.route.split("-")[0],
                           x: interp.x,
                           y: interp.y,
                           a: interp.a,
                          id: trip.id };
            currentBus.push(bus);
            if (interp.stops.a && interp.stops.b){
              currentStopInterps.push(interp.stops);
            }
          }
        }
        else {
          //console.log("no stops?");
        }
      });
      showShapeUsed(currentBus);                  //DEBUG
      showStopInterps(currentStopInterps);        //DEBUG
      return currentBus;
    }

    // Linear interpolation
    // Returns point between stops on path
    function interpolateBus(tripStops, shapeid, time) {
      var index  = tBisector.left(tripStops, time, 0, tripStops.length-1)
        , a      = tripStops[index]
        , aPoint = stopsIndexed[parseInt(a.id, 10)];
      if (index < 1) {
        if ( a.t > time ) {
          return -1; // time is earlier than the first stop, => trip hasn't begun
        }
        else {
          return { x: aPoint.x,
                   y: aPoint.y,
                   stops: { a: a.id },
                   a: 0 };
        }
      }
      else if (index == tripStops.length-1 && a.t < time) {
        return -1; // time is later than the last stop, => trip has ended
      }
      else {
        var b = tripStops[index-1];
        bPoint = stopsIndexed[parseInt(b.id, 10)];
        t = (time-a.t)/(b.t-a.t);

        bus = linearInterpolate(t, aPoint, bPoint);
        //bus = shapeInterpolate(t, aPoint, bPoint, shapeid);

        return { x: bus.x,
                 y: bus.y,
                 stops: { a: a.id, b: b.id },
                 a: Math.atan2(
                      bPoint.y - aPoint.y,
                      bPoint.x - aPoint.x ) * (180 / Math.PI) };
      }
    }

    function linearInterpolate(t, pt1, pt2) {
      return { x: (pt1.x * (1-t) + pt2.x * t),
               y: (pt1.y * (1-t) + pt2.y * t) }
    }

    function shapeInterpolate(t, pt1, pt2, shapeid) {
        // console.log(shapeid);
        var aPercentOfPath = getPtOnShapeNear(pt1, shapeid).percent
          , bPercentOfPath = getPtOnShapeNear(pt2, shapeid).percent
          , percentOfPath_range = aPercentOfPath - bPercentOfPath
          , newPercentOfPath = aPercentOfPath + percentOfPath_range*t;

        //console.log(aPercentOfPath+" < "+newPercentOfPath+" < "+bPercentOfPath);
        //console.log(percentOfPath_range);
        //console.log(t);

        var newPoint = getPtOnShapeAt(newPercentOfPath, shapeid);

        // console.log(newPoint);


        return { x: xScale.invert(newPoint.x),   // return in lat/lon so that
                 y: yScale.invert(newPoint.y) }  // it can be rescaled when
                                                 // the map is manipulated
    }

    var tBisector = d3.bisector(function(d){return d.t})


    // Labels
    // ------
    var labelBox,link;
    labelForce = d3.force_labels()
        .linkDistance(0)
        .gravity(0)
        .nodes([]).links([])
        .charge(-10)
        .on("tick",redrawLabels);

    function redrawLabels() {
        labelBox
            .attr("transform",function(d) { return "translate("+d.labelPos.x+" "+d.labelPos.y+")"})

        links
            .attr("x1",function(d) { return d.anchorPos.x})
            .attr("y1",function(d) { return d.anchorPos.y})
            .attr("x2",function(d) { return d.labelPos.x})
            .attr("y2",function(d) { return d.labelPos.y})
    }   

    // linear interpolation layer
    // --------------------------
    // to debug issue of multiple stops listed at the same time stamp
      function showStopInterps(interps) {
        var interps = stopLayer.selectAll(".interp").data(interps);
        // New interps
        interps.enter()
          .append("svg:line")
          .attr("class", "interp")
          .attr("stroke", "blue")
          .attr("opacity", "0.5")
          .attr("stroke-width", 1);
        // Refresh old interps
        refreshInterps();
        // Remove dead interps
        interps.exit().remove();
      }

      function showShapeUsed(current) {
        shapeLayer
          .selectAll(".line")
          .attr("opacity", "0.1")
          .attr("stroke", "gray");

        current.forEach(function(curr) {
          shapeLayer
            .select("#l"+curr.shape)
            .attr("opacity", "1")
            .attr("stroke", "red");
        });
      }

      function refreshInterps() {
        stopLayer.selectAll(".interp")
          .attr("x1", function(d) { return xScale( stopsIndexed[ parseInt(d.a) ].x ) } )
          .attr("y1", function(d) { return yScale( stopsIndexed[ parseInt(d.a) ].y ) } )
          .attr("x2", function(d) { return xScale( stopsIndexed[ parseInt(d.b) ].x ) } )
          .attr("y2", function(d) { return yScale( stopsIndexed[ parseInt(d.b) ].y ) } );
      }
    // ------------------------
    // End linear interpolation

	}

  // Time Control
  // ------------

  function TimeControl() {

    var autoRun = false;

    // Constructor
    // -----------

    bindEvents();

    // Private methods
    // ---------------
    function bindEvents() {
      $("#time-slide").change(function(e){
        tripControl.set(this.value);
      });
      $("#autoRunCheck").change(function(e) {
        if (!autoRun) {
          autoRun = true;
          d3.timer(timeStep, 200);
        }
        else autoRun = false;
      });
    }

    var t = 0;
    function timeStep() {
      if (!autoRun) return true; // stop timer
      else {
        tripControl.set(t/20);
        t += 1;
        // console.log(t);
        return false; // keep running
      }
    }

  }

	// Panning
	// -------

  var mouse = {x:0, y:0}
    , curr  = {x:0, y:0};

	function PanZoomControl(el) {
		var isPanning = false
		  , start = {x:0, y:0}
      ,  delta = {x:0, y:0}
      , prev  = {x:0, y:0}
      , vel  = {x:0, y:0}
			, $el = $(el)
			, $inner = $el.parent()
      , $container = $inner.parent()
      , $back = $container.parent()
      , limit = 800
      , currZoom = 1
      , xMin = 0
      , yMin = 0
      , xMax = $el.width()
      , yMax = $el.height();

    // Constructor
    // -----------
    bindEvents();

    function bindEvents() {
	    $back.mousedown(begin);
	    $("html").mousemove(move);
      $("html").mouseup(end);
      $("html").mouseleave(end);
	    $("#zoom-slide").change(function(e){
        currZoom = this.value;
	    	zoomTo(this.value);
	    });
	    $("#rotate-slide").change(function(e){
	    	rotateTo(this.value);
	    });

			$back.on( 'DOMMouseScroll mousewheel', function(e) {
				scrollZoom(e.originalEvent.wheelDelta);
			});
		}

    // Private Methods
    // ---------------

    function begin(event) {
      isPanning = true;
      start.x = mouse.x - curr.x;
      start.y = mouse.y - curr.y;
      vel = { x:0, y:0 };
      d3.timer(velCheck, 15);
    }
    function move(event) {

      // Always capture mouse position 
      mouse = { x: event.pageX, y: event.pageY };

      // Pan map
      if (isPanning) {
        curr.x = mouse.x - start.x;
        curr.y = mouse.y - start.y;

        width = $(window).width();
        height = $(window).height();

        // if (curr.x >  width  + limit) curr.x =  width  + limit;
        // if (curr.y >  height + limit) curr.y =  height + limit;
        // if (curr.x < -limit         ) curr.x = -limit;
        // if (curr.y < -limit         ) curr.y = -limit;

        $container.tform(curr.x, curr.y);
        //yScale.range( [ limit + curr.y, yMin     + curr.y ] );
        //xScale.range( [ xMin     + curr.x, limit + curr.x ] );
        //self.redraw();
      }
    }

    function end(event) {
      isPanning = false;
      //d3.timer(coastStep, 15);
    }

    function zoomTo(zoom, center){

      var zoomCenter = center || { x: $(window).width()/2, y: $(window).height()/2};
    	currZoom = parseFloat(zoom);
      prevCenter = getCenter(center);
      limit = 800*zoom;

      yScale.range( [ limit, 0    ] );
      xScale.range( [ 0    , limit] );

      curr.x = zoomCenter.x - prevCenter.x * limit;
      curr.y = zoomCenter.y - prevCenter.y * limit;

      $el.css({"width": limit, "height": limit});

      $container.tform(curr.x, curr.y);

      stopControl.refresh();
      shapeControl.setSmooth(1/currZoom);
      tripControl.refresh();
    }

    function scrollZoom(scroll) {
    	currZoom += parseFloat(0.005 * scroll);
    	if (currZoom < 0.5) {
    		currZoom = 0.51;
    	}
    	$("#zoom-slide").val(currZoom);
    	zoomTo(currZoom, { x: mouse.x, y: mouse.y});
    }

    function rotateTo(angle) {
      $el.css("-webkit-transform","rotate("+angle+"deg)");
    }

    function getCenter(center) {
      // prevCenter is the distance from the mouse cursor tp
      // the top-left corner of the map as a percentage of the map
      // size. If the mouse isn't specified fall back to the 
      // center of the viewport
      viewCenter = center || { x: $(window).width()/2, y: $(window).height()/2 };
      return {
      	x: (viewCenter.x - $inner.offset().left) / limit,
      	y: (viewCenter.y - $inner.offset().top) / limit
      };
    }

    function velCheck() {
      if (isPanning) {
        vel = { x: curr.x - prev.x, 
                y: curr.y - prev.y };
        prev = { x: curr.x, y: curr.y };
        return false; // continue timer
      }
      else return true;  // end timer
    }

    function coastStep() {
      if (isPanning) return true;                   // stop timer
      vel.x = parseInt( vel.x * 0.9 * 100 ) / 100;  // 2 decimal precision
      vel.y = parseInt( vel.y * 0.9 * 100 ) / 100;
      if (Math.abs(vel.x + vel.y) < 0.01) {
        return true;                                // stop timer
      }
      else {
        curr = { x: parseFloat( curr.x + vel.x),
                 y: parseFloat( curr.y + vel.y) };
        $container.tform(curr.x, curr.y);
        return false;                               // continue timer
      }
    }
 	}

	// Scales
	// ------
	function setupScales() {
	  yScale = d3.scale.linear()
	    .domain([agency.lat.min, agency.lat.max])
	    .range([800, 0]); // reversed because lat is measured west of meridian
	  xScale = d3.scale.linear()
	    .domain([agency.lon.min, agency.lon.max])
	    .range([0, 800]);
  }

  this.redraw = function() {
      stopControl.refresh();
      shapeControl.refresh();
      tripControl.refresh();
  }

  // Finding points along paths
  // --------------------------
  var circle = 
          shapeLayer.append("circle")
            .attr("cx", 100)
            .attr("cy", 350)
            .attr("r", 3)
            .attr("fill", "red");

  map.on("mousemove", function() {
    var shiftedmouse = { x: mouse.x - curr.x, y: mouse.y - curr.y };
    var nearest = getPtOnShapeNear(shiftedmouse, "600028");

    circle
      .attr("opacity", 1)
      .attr("cx", nearest.x)
      .attr("cy", nearest.y);

  });
}

// --------------------------------------------------------

// These are a few handy utility methods


// Given a point {x: x1, y: y1} and a unique
// shapeid, find the point on the shape nearest
// to the target and also return how far along
// the shape it is

function getPtOnShapeNear(target, shapeid) {

    var pathEl = d3.select("#l"+shapeid).node();

    var pathLength = pathEl.getTotalLength();

    // loop through all points
    // to find the one closest to the target
    // ------------------------------------
    var minDist = 10000000
      , minPos = {x:0,y:0}
      , minRatio = 0;

    for (i = 0; i < pathLength; i++) {
      var pos = pathEl.getPointAtLength(i)
        , dist = getDist(pos,target);

      if (dist < minDist) {
        minDist = dist;
        minPos = pos;
        minRatio = i / pathLength;
      }
      if (minDist < 1) break; // stop looking if we're pretty close
    }
    return { x: minPos.x, y: minPos.y, percent: minRatio };
}

function getPtOnShapeAt(percentLength, shapeid) {
    var pathEl = d3.select("#l"+shapeid).node()
      , pathLength = pathEl.getTotalLength();
    return pathEl.getPointAtLength( percentLength * pathLength );
}

// Given 2 points {x: x1, y: y1} and {x: x2, y: y2}
// return the distance between them

function getDist(pt1,pt2) {
  return Math.sqrt((pt2.y-pt1.y)*(pt2.y-pt1.y) + (pt2.x-pt1.x)*(pt2.x-pt1.x));
}


// --------------------------------------------------------

// These are simple JQuery plugins to make
// CSS3 transforms simple

(function( $ ){
  $.fn.tform = function(x,y){
    this.css(
      "-webkit-transform",
      "translate3d("+x+"px,"+y+"px,0)"
    );
  }
})( jQuery );