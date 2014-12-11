// Generated by CoffeeScript 1.6.3
/*
** Annotator 1.2.6-dev-bee2b25
** https://github.com/okfn/annotator/
**
** Copyright 2012 Aron Carroll, Rufus Pollock, and Nick Stenning.
** Dual licensed under the MIT and GPLv3 licenses.
** https://github.com/okfn/annotator/blob/master/LICENSE
**
** Built at: 2014-12-11 02:43:05Z
*/



/*
//
*/

// Generated by CoffeeScript 1.6.3
(function() {
  var _ref,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window.PDFTextMapper = (function(_super) {
    __extends(PDFTextMapper, _super);

    PDFTextMapper.isPDFDocument = function() {
      return (typeof PDFView !== "undefined" && PDFView !== null) || (typeof PDFViewerApplication !== "undefined" && PDFViewerApplication !== null);
    };

    PDFTextMapper.applicable = function() {
      return this.isPDFDocument();
    };

    PDFTextMapper.prototype.requiresSmartStringPadding = true;

    PDFTextMapper.prototype.getPageCount = function() {
      return this._viewer.pages.length;
    };

    PDFTextMapper.prototype.getPageIndex = function() {
      return this._app.page - 1;
    };

    PDFTextMapper.prototype.setPageIndex = function(index) {
      return this._app.page = index + 1;
    };

    PDFTextMapper.prototype._isPageRendered = function(index) {
      var _ref, _ref1;
      return (_ref = this._viewer.pages[index]) != null ? (_ref1 = _ref.textLayer) != null ? _ref1.renderingDone : void 0 : void 0;
    };

    PDFTextMapper.prototype.getRootNodeForPage = function(index) {
      return this._viewer.pages[index].textLayer.textLayerDiv;
    };

    function PDFTextMapper() {
      this._finishScan = __bind(this._finishScan, this);
      this._parseExtractedText = __bind(this._parseExtractedText, this);
      var _ref,
        _this = this;
      if (typeof PDFViewerApplication !== "undefined" && PDFViewerApplication !== null) {
        this._app = PDFViewerApplication;
        this._viewer = this._app.pdfViewer;
        this._tryExtractPage = function(index) {
          return _this._viewer.getPageTextContent(index);
        };
      } else {
        this._app = this._viewer = PDFView;
        this._finder = (_ref = this._app.findController) != null ? _ref : PDFFindController;
        this._tryExtractPage = function(index) {
          return new Promise(function(resolve, reject) {
            var tryIt;
            tryIt = function() {
              var page;
              page = _this._finder.pdfPageSource.pages[index];
              if ((page != null ? page.pdfPage : void 0) != null) {
                return page.getTextContent().then(resolve);
              } else {
                return setTimeout(tryIt, 100);
              }
            };
            return tryIt();
          });
        };
      }
      this.setEvents();
    }

    PDFTextMapper.prototype.setEvents = function() {
      var viewer,
        _this = this;
      addEventListener("pagerender", function(evt) {
        var index;
        if (_this.pageInfo == null) {
          return;
        }
        index = evt.detail.pageNumber - 1;
        return _this._onPageRendered(index);
      });
      addEventListener("DOMNodeRemoved", function(evt) {
        var index, node;
        node = evt.target;
        if (node.nodeType === Node.ELEMENT_NODE && node.nodeName.toLowerCase() === "div" && node.className === "textLayer") {
          index = parseInt(node.parentNode.id.substr(13) - 1);
          return _this._unmapPage(_this.pageInfo[index]);
        }
      });
      viewer = document.getElementById("viewer");
      viewer.addEventListener("domChange", function(event) {
        var data, endPage, node, startPage, _ref;
        node = (_ref = event.srcElement) != null ? _ref : event.target;
        data = event.data;
        if ("viewer" === (typeof node.getAttribute === "function" ? node.getAttribute("id") : void 0)) {
          console.log("Detected cross-page change event.");
          if ((data.start != null) && (data.end != null)) {
            startPage = _this.getPageForNode(data.start);
            _this._updateMap(_this.pageInfo[startPage.index]);
            endPage = _this.getPageForNode(data.end);
            return _this._updateMap(_this.pageInfo[endPage.index]);
          }
        }
      });
      return this._viewer.container.addEventListener("scroll", this._onScroll);
    };

    PDFTextMapper.prototype._extractionPattern = /[ ]+/g;

    PDFTextMapper.prototype._parseExtractedText = function(text) {
      return text.replace(this._extractionPattern, " ");
    };

    PDFTextMapper.prototype.waitForInit = function() {
      var tryIt,
        _this = this;
      tryIt = function(resolve) {
        if (_this._app.documentFingerprint && _this._app.documentInfo) {
          return resolve();
        } else {
          return setTimeout((function() {
            return tryIt(resolve);
          }), 100);
        }
      };
      return new Promise(function(resolve, reject) {
        if (PDFTextMapper.applicable()) {
          return tryIt(resolve);
        } else {
          return reject("Not a PDF.js document");
        }
      });
    };

    PDFTextMapper.prototype.scan = function() {
      var _this = this;
      return new Promise(function(resolve, reject) {
        _this._pendingScanResolve = resolve;
        return _this.waitForInit().then(function() {
          return _this._app.pdfDocument.getPage(1).then(function() {
            _this.pageInfo = [];
            return _this._extractPageText(0);
          });
        });
      });
    };

    PDFTextMapper.prototype._extractPageText = function(pageIndex) {
      var _this = this;
      return this._tryExtractPage(pageIndex).then(function(data) {
        var content, rawContent, text, textData, _ref, _ref1;
        textData = (_ref = (_ref1 = data.bidiTexts) != null ? _ref1 : data.items) != null ? _ref : data;
        rawContent = ((function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = textData.length; _i < _len; _i++) {
            text = textData[_i];
            _results.push(text.str);
          }
          return _results;
        })()).join(" ");
        content = _this._parseExtractedText(rawContent);
        _this.pageInfo[pageIndex] = {
          index: pageIndex,
          content: content
        };
        if (pageIndex === _this.getPageCount() - 1) {
          return _this._finishScan();
        } else {
          return _this._extractPageText(pageIndex + 1);
        }
      });
    };

    PDFTextMapper.prototype._finishScan = function() {
      this._onHavePageContents();
      this._pendingScanResolve();
      return this._onAfterScan();
    };

    PDFTextMapper.prototype.getPageForNode = function(node) {
      var div, index;
      div = node;
      while ((div.nodeType !== Node.ELEMENT_NODE) || (div.getAttribute("class") == null) || (div.getAttribute("class") !== "textLayer")) {
        div = div.parentNode;
      }
      index = parseInt(div.parentNode.id.substr(13) - 1);
      return this.pageInfo[index];
    };

    PDFTextMapper.prototype.getDocumentFingerprint = function() {
      return this._app.documentFingerprint;
    };

    PDFTextMapper.prototype.getDocumentInfo = function() {
      return this._app.documentInfo;
    };

    return PDFTextMapper;

  })(PageTextMapperCore);

  Annotator.Plugin.PDF = (function(_super) {
    var $;

    __extends(PDF, _super);

    function PDF() {
      this.beforeAnnotationCreated = __bind(this.beforeAnnotationCreated, this);
      this.getMetaData = __bind(this.getMetaData, this);
      _ref = PDF.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    $ = Annotator.$;

    PDF.prototype.pluginInit = function() {
      if (!this.annotator.plugins.DomTextMapper) {
        console.warn("The PDF Annotator plugin requires the DomTextMapper plugin. Skipping.");
        return;
      }
      return this.annotator.documentAccessStrategies.unshift({
        name: "PDF.js",
        mapper: PDFTextMapper
      });
    };

    PDF.prototype._isPDF = function() {
      return PDFTextMapper.applicable();
    };

    PDF.prototype._getDocumentURI = function() {
      var match, matches, uri;
      uri = window.location.href;
      matches = uri.match('chrome-extension://[a-z]{32}/(content/web/viewer.html\\?file=)?(.*)');
      match = matches != null ? matches[matches.length - 1] : void 0;
      if (match) {
        return decodeURIComponent(match);
      } else {
        return uri;
      }
    };

    PDF.prototype._getFingerPrintURI = function() {
      var fingerprint;
      fingerprint = this.annotator.domMapper.getDocumentFingerprint();
      return "urn:x-pdf:" + fingerprint;
    };

    PDF.prototype.uri = function() {
      if (!this._isPDF()) {
        return null;
      }
      return this._getFingerPrintURI();
    };

    PDF.prototype._getTitle = function() {
      var title, _ref1;
      title = (_ref1 = this.annotator.domMapper.getDocumentInfo().Title) != null ? _ref1.trim() : void 0;
      if ((title != null) && title !== "") {
        return title;
      } else {
        return $("head title").text().trim();
      }
    };

    PDF.prototype._metadata = function() {
      var documentURI, metadata;
      metadata = {
        link: [
          {
            href: this._getFingerPrintURI()
          }
        ],
        title: this._getTitle()
      };
      documentURI = this._getDocumentURI();
      if (documentURI.toLowerCase().indexOf('file://') === 0) {
        metadata.filename = new URL(documentURI).pathname.split('/').pop();
      } else {
        metadata.link.push({
          href: documentURI
        });
      }
      return metadata;
    };

    PDF.prototype.getMetaData = function() {
      var _this = this;
      return new Promise(function(resolve, reject) {
        if (_this.annotator.domMapper.waitForInit != null) {
          return _this.annotator.domMapper.waitForInit().then(function() {
            var error;
            try {
              return resolve(_this._metadata());
            } catch (_error) {
              error = _error;
              return reject("Internal error");
            }
          });
        } else {
          return reject("Not a PDF dom mapper.");
        }
      });
    };

    PDF.prototype.events = {
      'beforeAnnotationCreated': 'beforeAnnotationCreated'
    };

    PDF.prototype.beforeAnnotationCreated = function(annotation) {
      if (!this._isPDF()) {
        return;
      }
      return annotation.document = this._metadata();
    };

    return PDF;

  })(Annotator.Plugin);

}).call(this);
