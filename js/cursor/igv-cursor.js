var igv = (function (igv) {

    igv.createCursorBrowser = function () {

        var browser = new igv.Browser("CURSOR"),
            contentHeader = $('<div class="row"></div>')[0],
            contentHeaderDiv = $('<div id="igvHeaderDiv" class="col-md-12" style="font-size:16px;"><span id="igvHeaderRegionDisplaySpan"></span></div>')[0],
            trackContainer = $('<div id="igvTrackContainerDiv" class="igv-track-container-div">')[0];

        browser.div = $('<div id="igvRootDiv" class="igv-root-div">')[0];
        $(browser.div).append(contentHeader);
        $(contentHeader).append(contentHeaderDiv);
        $(browser.div).append(trackContainer);
        document.getElementById('igvContainerDiv').appendChild(browser.div);

        browser.horizontalScrollbar = new cursor.HorizontalScrollbar( $(trackContainer) );

        // Append event handlers to DOM elements
        document.getElementById('zoomOut').onclick = function (e) {
            browser.zoomOut()
        };
        document.getElementById('zoomIn').onclick = function () {
            browser.zoomIn()
        };
        document.getElementById('fitToScreen').onclick = function () {
            browser.fitToScreen();
        };
        document.getElementById('frameWidthInput').onchange = function (e) {

            var value = $("#frameWidthInput").val();
            if (!igv.isNumber(value)) {
                console.log("bogus " + value);
                return;
            }

            browser.setFrameWidth(parseFloat(value, 10));

        };
        document.getElementById('regionSizeInput').onchange = function (e) {

            var value = $("#regionSizeInput").val();
            if (!igv.isNumber(value)) {
                console.log("bogus " + value);
                return;
            }

            browser.setRegionSize(parseFloat(value, 10));
        };
        document.getElementById('trackHeightInput').onchange = function (e) {

            var value = $("#trackHeightInput").val();
            if (!igv.isNumber(value)) {
                console.log("bogus " + value);
                return;
            }


            browser.setTrackHeight( Math.round(parseFloat(value, 10)) );
        };

        var fileInput = document.getElementById('fileInput');
        fileInput.addEventListener('change', function(e) {

            var localFile,
                localFiles = fileInput.files,
                featureSource,
                cursorTrack;


            for (var i=0; i < localFiles.length; i++) {

                localFile = localFiles[ i ];

                featureSource = new igv.BedFeatureSource(localFile);

                cursorTrack = new cursor.CursorTrack(featureSource, browser.cursorModel,browser.referenceFrame, localFile.name, browser.trackHeight);
                browser.addTrack(cursorTrack);

            }


        });

        // Load ENCODE DataTables data and build markup for modal dialog.
        encode.createEncodeDataTablesDataSet("test/data/cursor/encode/peaks.hg19.txt", function (dataSet) {

            var encodeModalTable = $('#encodeModalTable'),
                myDataTable = encodeModalTable.dataTable( {

                "data": dataSet,
                "scrollY":        "400px",
                "scrollCollapse": true,
                "paging":         false,

                "columns": [

                    { "title": "cell" },
                    { "title": "dataType" },

                    { "title": "antibody" },
                    { "title": "view" },

                    { "title": "replicate" },
                    { "title": "type" },

                    { "title": "lab" },
                    { "title": "path" }
                ]

            } );

            encodeModalTable.find('tbody').on( 'click', 'tr', function () {

                if ( $(this).hasClass('selected') ) {

                    $(this).removeClass('selected');
                }
                else {

                    // Commenting this out enables multi-selection
//                    myDataTable.$('tr.selected').removeClass('selected');
                    $(this).addClass('selected');
                }

            } );

            $('#encodeModalTopCloseButton').on( 'click', function () {
                myDataTable.$('tr.selected').removeClass('selected');

            } );

            $('#encodeModalBottomCloseButton').on( 'click', function () {
                myDataTable.$('tr.selected').removeClass('selected');
            } );

            $('#encodeModalGoButton').on( 'click', function () {

                var featureSource,
                    cursorTrack,
                    tableRow,
                    tableRows,
                    tableCell,
                    tableCells,
                    record = {};

                tableRows = myDataTable.$('tr.selected');

                if (0 < tableRows.length) {

                    tableRows.removeClass('selected');

                    for (var i= 0; i < tableRows.length; i++) {

                        tableRow = tableRows[ i ];
                        tableCells = $('td', tableRow);

                        tableCells.each (function() {

                            tableCell = $(this)[0];
                            record[ encode.dataTableRowLabels[ tableCell.cellIndex ] ] = tableCell.innerText;

                        });

                        featureSource = new igv.BedFeatureSource(record.path);

                        cursorTrack = new cursor.CursorTrack(featureSource, browser.cursorModel, browser.referenceFrame, encode.encodeTrackLabel(record), browser.trackHeight);
                        cursorTrack.color = encode.encodeAntibodyColor(record.antibody);

                        browser.addTrack(cursorTrack);

                    }

                }

            });

        });

        // Append resultant ENCODE DataTables markup
        $('#encodeModalBody').html( '<table cellpadding="0" cellspacing="0" border="0" class="display" id="encodeModalTable"></table>' );

        browser.startup = function () {

            browser.genome = null;

            browser.referenceFrame = null;

            browser.controlPanelWidth = 50;

            browser.trackContainerDiv = trackContainer;

            browser.trackPanels = [];

            initCursor();

            window.onresize = throttle(function () {

                var percent;

                if (browser.ideoPanel) {
                    browser.ideoPanel.resize();
                }

                browser.trackPanels.forEach(function (panel) {
                    panel.resize();
                });

                if (browser.cursorModel) {

                    percent = 100.0 * ($(".igv-viewport-div").first().width()/$(".igv-track-div").first().width());
                    $(".igv-horizontal-scrollbar-div").css({
                        "width" : percent + "%"
                    });

                }


            }, 10);

            function initCursor() {

                var regionDisplayJQueryObject = $('#igvHeaderRegionDisplaySpan');

                browser.cursorModel = new cursor.CursorModel(browser, regionDisplayJQueryObject);
                browser.referenceFrame = new igv.ReferenceFrame("", 0, 1 / browser.cursorModel.framePixelWidth);

                browser.setFrameWidth = function (frameWidthString) {

                    var frameWidth = parseFloat(frameWidthString);
                    if (frameWidth > 0) {

                        browser.cursorModel.framePixelWidth = frameWidth;
                        $( "input[id='frameWidthInput']" ).val( browser.cursorModel.framePixelWidth );

                        browser.referenceFrame.bpPerPixel = 1 / frameWidth;
                        browser.update();
                    }
                };

                browser.setRegionSize = function (regionSizeString) {

                    var regionSize = parseFloat(regionSizeString);
                    if (regionSize > 0) {

                        browser.cursorModel.regionWidth = regionSize;
                        browser.update();
                    }

                };

                browser.zoomIn = function () {

                    browser.cursorModel.framePixelWidth *= 2;
                    $( "input[id='frameWidthInput']" ).val( browser.cursorModel.framePixelWidth );

                    browser.update();
                };

                browser.zoomOut = function () {

                    var thresholdFramePixelWidth = $(".igv-viewport-div").first().width() / browser.cursorModel.getRegionList().length;

                    browser.cursorModel.framePixelWidth = Math.max(thresholdFramePixelWidth, browser.cursorModel.framePixelWidth/2.0);

//                    console.log("candidate " + browser.cursorModel.framePixelWidth + " threshold " + thresholdFramePixelWidth);

                    $( "input[id='frameWidthInput']" ).val( browser.cursorModel.framePixelWidth );

                    browser.update();
                };

                browser.fitToScreen = function () {

                    var regionCount,
                        frameWidth;

                    if (!(browser.cursorModel && browser.cursorModel.regions)) {
                        return;
                    }

                    regionCount = browser.cursorModel.getRegionList().length;

                    if (regionCount > 0) {
//                        frameWidth = (browser.trackContainerDiv.clientWidth - browser.controlPanelWidth) / regionCount;
                        frameWidth = $(".igv-viewport-div").first().width() / regionCount;
                        browser.referenceFrame.start = 0;
                        browser.setFrameWidth(frameWidth);
                        $('frameWidthBox').value = frameWidth;
                    }
                };

                var tssUrl = "test/data/cursor/hg19.tss.bed.gz";
                var peakURL = "test/data/cursor/wgEncodeBroadHistoneH1hescH3k4me3StdPk.broadPeak.gz";
                var peak2URL = "test/data/cursor/wgEncodeBroadHistoneH1hescH3k27me3StdPk.broadPeak.gz";

                var peakDataSource = new igv.BedFeatureSource(peakURL);
                var peak2DataSource = new igv.BedFeatureSource(peak2URL);
                var tssDataSource = new igv.BedFeatureSource(tssUrl);

                var tssTrack = new cursor.CursorTrack(tssDataSource, browser.cursorModel, browser.referenceFrame, "TSS", 40);

                var track1 = new cursor.CursorTrack(peakDataSource, browser.cursorModel, browser.referenceFrame, "H3k4me3 H1hesc", browser.trackHeight);
                track1.color = "rgb(0,150,0)";

                var track2 = new cursor.CursorTrack(peak2DataSource, browser.cursorModel, browser.referenceFrame, "H3k27me3 H1hesc", browser.trackHeight);
                track2.color = "rgb(150,0,0)";

                // Set the TSS track as the inital "selected" track (i.e. defines the regions)
                tssDataSource.allFeatures(function (featureList) {

                    browser.cursorModel.setRegions(featureList);

                    browser.addTrack(tssTrack);

                    browser.addTrack(track1);

                    browser.addTrack(track2);

                    tssTrack.labelButton.className = "btn btn-xs btn-cursor-selected";

                    browser.horizontalScrollbar.update(browser.cursorModel, browser.referenceFrame);
                });

            }
        };

        return browser;
    };

    function throttle(fn, threshhold, scope) {
        threshhold || (threshhold = 100);
        var last, deferTimer;

        return function () {
            var context = scope || this;

            var now = +new Date,
                args = arguments;
            if (last && now < last + threshhold) {
                // hold on to it
                clearTimeout(deferTimer);
                deferTimer = setTimeout(function () {
                    last = now;
                    fn.apply(context, args);
                }, threshhold);
            } else {
                last = now;
                fn.apply(context, args);
            }
        }
    }

    return igv;

})(igv || {});