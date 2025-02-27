 /*!
PSD.js - A Photoshop file parser for browsers and NodeJS
https://github.com/meltingice/psd.js

MIT LICENSE
Copyright (c) 2011 Ryan LeFevre
 
Permission is hereby granted, free of charge, to any person obtaining a copy of this 
software and associated documentation files (the "Software"), to deal in the Software 
without restriction, including without limitation the rights to use, copy, modify, merge, 
publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons 
to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or 
substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING 
BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND 
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, 
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/(function() {
    function JSPack() 
    {
        var el, bBE = false, m = this;
        m._DeArray = function(a, p, l) 
        {
            return [a.slice(p, p + l)];
        };
        m._EnArray = function(a, p, l, v) 
        {
            for (var i = 0; i < l; a[p + i] = v[i] ? v[i] : 0, i++)
                ;
        };
        m._DeChar = function(a, p) 
        {
            return String.fromCharCode(a[p]);
        };
        m._EnChar = function(a, p, v) 
        {
            a[p] = v.charCodeAt(0);
        };
        m._DeInt = function(a, p) 
        {
            var lsb = bBE ? (el.len - 1) : 0, nsb = bBE ? -1 : 1, stop = lsb + nsb * el.len, rv, i, f;
            for (rv = 0, i = lsb, f = 1; i != stop; rv += (a[p + i] * f), i += nsb, f *= 256)
                ;
            if (el.bSigned && (rv & Math.pow(2, el.len * 8 - 1))) {
                rv -= Math.pow(2, el.len * 8);
            }
            return rv;
        };
        m._EnInt = function(a, p, v) 
        {
            var lsb = bBE ? (el.len - 1) : 0, nsb = bBE ? -1 : 1, stop = lsb + nsb * el.len, i;
            v = (v < el.min) ? el.min : (v > el.max) ? el.max : v;
            for (i = lsb; i != stop; a[p + i] = v & 0xff, i += nsb, v >>= 8)
                ;
        };
        m._DeString = function(a, p, l) 
        {
            for (var rv = new Array(l), i = 0; i < l; rv[i] = String.fromCharCode(a[p + i]), i++)
                ;
            return rv.join('');
        };
        m._EnString = function(a, p, l, v) 
        {
            for (var t, i = 0; i < l; a[p + i] = (t = v.charCodeAt(i)) ? t : 0, i++)
                ;
        };
        m._De754 = function(a, p) 
        {
            var s, e, m, i, d, nBits, mLen, eLen, eBias, eMax;
            mLen = el.mLen, eLen = el.len * 8 - el.mLen - 1, eMax = (1 << eLen) - 1, eBias = eMax >> 1;
            i = bBE ? 0 : (el.len - 1);
            d = bBE ? 1 : -1;
            s = a[p + i];
            i += d;
            nBits = -7;
            for (e = s & ((1 << (-nBits)) - 1), s >>= (-nBits), nBits += eLen; nBits > 0; e = e * 256 + a[p + i], i += d, nBits -= 8)
                ;
            for (m = e & ((1 << (-nBits)) - 1), e >>= (-nBits), nBits += mLen; nBits > 0; m = m * 256 + a[p + i], i += d, nBits -= 8)
                ;
            switch (e) 
            {
                case 0:
                    e = 1 - eBias;
                    break;
                case eMax:
                    return m ? NaN : ((s ? -1 : 1) * Infinity);
                default:
                    m = m + Math.pow(2, mLen);
                    e = e - eBias;
                    break;
            }
            return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
        };
        m._En754 = function(a, p, v) 
        {
            var s, e, m, i, d, c, mLen, eLen, eBias, eMax;
            mLen = el.mLen, eLen = el.len * 8 - el.mLen - 1, eMax = (1 << eLen) - 1, eBias = eMax >> 1;
            s = v < 0 ? 1 : 0;
            v = Math.abs(v);
            if (isNaN(v) || (v == Infinity)) 
            {
                m = isNaN(v) ? 1 : 0;
                e = eMax;
            } 
            else 
            {
                e = Math.floor(Math.log(v) / Math.LN2);
                if (v * (c = Math.pow(2, -e)) < 1) {
                    e--;
                    c *= 2;
                }
                if (e + eBias >= 1) {
                    v += el.rt / c;
                } 
                else {
                    v += el.rt * Math.pow(2, 1 - eBias);
                }
                if (v * c >= 2) {
                    e++;
                    c /= 2;
                }
                if (e + eBias >= eMax) 
                {
                    m = 0;
                    e = eMax;
                } 
                else if (e + eBias >= 1) 
                {
                    m = (v * c - 1) * Math.pow(2, mLen);
                    e = e + eBias;
                } 
                else 
                {
                    m = v * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
                    e = 0;
                }
            }
            for (i = bBE ? (el.len - 1) : 0, d = bBE ? -1 : 1; mLen >= 8; a[p + i] = m & 0xff, i += d, m /= 256, mLen -= 8)
                ;
            for (e = (e << mLen) | m, eLen += mLen; eLen > 0; a[p + i] = e & 0xff, i += d, e /= 256, eLen -= 8)
                ;
            a[p + i - d] |= s * 128;
        };
        m._sPattern = '(\\d+)?([AxcbBhHsfdiIlL])';
        m._lenLut = {'A': 1,'x': 1,'c': 1,'b': 1,'B': 1,'h': 2,'H': 2,'s': 1,'f': 4,'d': 8,'i': 4,'I': 4,'l': 4,'L': 4};
        m._elLut = {'A': {en: m._EnArray,de: m._DeArray},'s': {en: m._EnString,de: m._DeString},'c': {en: m._EnChar,de: m._DeChar},'b': {en: m._EnInt,de: m._DeInt,len: 1,bSigned: true,min: -Math.pow(2, 7),max: Math.pow(2, 7) - 1},'B': {en: m._EnInt,de: m._DeInt,len: 1,bSigned: false,min: 0,max: Math.pow(2, 8) - 1},'h': {en: m._EnInt,de: m._DeInt,len: 2,bSigned: true,min: -Math.pow(2, 15),max: Math.pow(2, 15) - 1},'H': {en: m._EnInt,de: m._DeInt,len: 2,bSigned: false,min: 0,max: Math.pow(2, 16) - 1},'i': {en: m._EnInt,de: m._DeInt,len: 4,bSigned: true,min: -Math.pow(2, 31),max: Math.pow(2, 31) - 1},'I': {en: m._EnInt,de: m._DeInt,len: 4,bSigned: false,min: 0,max: Math.pow(2, 32) - 1},'l': {en: m._EnInt,de: m._DeInt,len: 4,bSigned: true,min: -Math.pow(2, 31),max: Math.pow(2, 31) - 1},'L': {en: m._EnInt,de: m._DeInt,len: 4,bSigned: false,min: 0,max: Math.pow(2, 32) - 1},'f': {en: m._En754,de: m._De754,len: 4,mLen: 23,rt: Math.pow(2, -24) - Math.pow(2, -77)},'d': {en: m._En754,de: m._De754,len: 8,mLen: 52,rt: 0}};
        m._UnpackSeries = function(n, s, a, p) 
        {
            for (var fxn = el.de, rv = [], i = 0; i < n; rv.push(fxn(a, p + i * s)), i++)
                ;
            return rv;
        };
        m._PackSeries = function(n, s, a, p, v, i) 
        {
            for (var fxn = el.en, o = 0; o < n; fxn(a, p + o * s, v[i + o]), o++)
                ;
        };
        m.Unpack = function(fmt, a, p) 
        {
            bBE = (fmt.charAt(0) != '<');
            p = p ? p : 0;
            var re = new RegExp(this._sPattern, 'g'), m, n, s, rv = [];
            while (m = re.exec(fmt)) 
            {
                n = ((m[1] == undefined) || (m[1] == '')) ? 1 : parseInt(m[1]);
                s = this._lenLut[m[2]];
                if ((p + n * s) > a.length) 
                {
                    return undefined;
                }
                switch (m[2]) 
                {
                    case 'A':
                    case 's':
                        rv.push(this._elLut[m[2]].de(a, p, n));
                        break;
                    case 'c':
                    case 'b':
                    case 'B':
                    case 'h':
                    case 'H':
                    case 'i':
                    case 'I':
                    case 'l':
                    case 'L':
                    case 'f':
                    case 'd':
                        el = this._elLut[m[2]];
                        rv.push(this._UnpackSeries(n, s, a, p));
                        break;
                }
                p += n * s;
            }
            return Array.prototype.concat.apply([], rv);
        };
        m.PackTo = function(fmt, a, p, values) 
        {
            bBE = (fmt.charAt(0) != '<');
            var re = new RegExp(this._sPattern, 'g'), m, n, s, i = 0, j;
            while (m = re.exec(fmt)) 
            {
                n = ((m[1] == undefined) || (m[1] == '')) ? 1 : parseInt(m[1]);
                s = this._lenLut[m[2]];
                if ((p + n * s) > a.length) 
                {
                    return false;
                }
                switch (m[2]) 
                {
                    case 'A':
                    case 's':
                        if ((i + 1) > values.length) {
                            return false;
                        }
                        this._elLut[m[2]].en(a, p, n, values[i]);
                        i += 1;
                        break;
                    case 'c':
                    case 'b':
                    case 'B':
                    case 'h':
                    case 'H':
                    case 'i':
                    case 'I':
                    case 'l':
                    case 'L':
                    case 'f':
                    case 'd':
                        el = this._elLut[m[2]];
                        if ((i + n) > values.length) {
                            return false;
                        }
                        this._PackSeries(n, s, a, p, values, i);
                        i += n;
                        break;
                    case 'x':
                        for (j = 0; j < n; j++) {
                            a[p + j] = 0;
                        }
                        break;
                }
                p += n * s;
            }
            return a;
        };
        m.Pack = function(fmt, values) 
        {
            return this.PackTo(fmt, new Array(this.CalcLength(fmt)), 0, values);
        };
        m.CalcLength = function(fmt) 
        {
            var re = new RegExp(this._sPattern, 'g'), m, sum = 0;
            while (m = re.exec(fmt)) 
            {
                sum += (((m[1] == undefined) || (m[1] == '')) ? 1 : parseInt(m[1])) * this._lenLut[m[2]];
            }
            return sum;
        };
    }
    ;
    var jspack = new JSPack();
    ;
    var Log, PSD, PSDBlackWhite, PSDBrightnessContrast, PSDChannelImage, PSDColor, PSDColorBalance, PSDCurves, PSDDescriptor, PSDDropDownLayerEffect, PSDExposure, PSDFile, PSDGradient, PSDHeader, PSDHueSaturation, PSDImage, PSDInvert, PSDLayer, PSDLayerEffect, PSDLayerEffectCommonStateInfo, PSDLayerMask, PSDLevels, PSDPattern, PSDPhotoFilter, PSDPosterize, PSDResource, PSDSelectiveColor, PSDSolidColor, PSDThreshold, PSDTypeTool, PSDVibrance, Root, Util, assert, fs, __hasProp = {}.hasOwnProperty, __extends = function(child, parent) {
        for (var key in parent) {
            if (__hasProp.call(parent, key))
                child[key] = parent[key];
        }
        function ctor() {
            this.constructor = child;
        }
        ctor.prototype = parent.prototype;
        child.prototype = new ctor();
        child.__super__ = parent.prototype;
        return child;
    };
    assert = (function(assert) {
        if (typeof exports !== "undefined" && exports !== null) {
            return require('assert');
        }
        assert = function(test) {
            if (test !== true) {
                throw "Assertion error";
            }
        };
        assert.equal = function(actual, expected) {
            if (actual !== expected) {
                throw "Assertion error";
            }
        };
        return assert;
    })(assert);
    if (typeof exports !== "undefined" && exports !== null) {
        Root = exports;
        fs = require('fs');
    } else {
        Root = window;
    }
    Root.PSD = PSD = (function() {
        PSD.VERSION = "0.4.5";
        PSD.DEBUG = false;
        PSD.fromFile = function(file, cb) {
            var data, reader;
            if (cb == null) {
                cb = function() {
                };
            }
            if (typeof exports !== "undefined" && exports !== null) {
                data = fs.readFileSync(file);
                return new PSD(data);
            } else {
                reader = new FileReader();
                reader.onload = function(f) {
                    var bytes, psd;
                    bytes = new Uint8Array(f.target.result);
                    psd = new PSD(bytes);
                    return cb(psd);
                };
                return reader.readAsArrayBuffer(file);
            }
        };
        PSD.fromURL = function(url, cb) {
            var xhr;
            if (cb == null) {
                cb = function() {
                };
            }
            xhr = new XMLHttpRequest;
            xhr.open("GET", url, true);
            xhr.responseType = "arraybuffer";
            xhr.onload = function() {
                var data, psd;
                data = new Uint8Array(xhr.response || xhr.mozResponseArrayBuffer);
                psd = new PSD(data);
                return cb(psd);
            };
            return xhr.send(null);
        };
        PSD.prototype.options = {layerImages: false,onlyVisibleLayers: false};
        function PSD(data) {
            this.file = new PSDFile(data);
            this.header = null;
            this.resources = null;
            this.layerMask = null;
            this.layers = null;
            this.images = null;
            this.image = null;
        }
        PSD.prototype.setOptions = function(options) {
            var key, val, _results;
            _results = [];
            for (key in options) {
                if (!__hasProp.call(options, key))
                    continue;
                val = options[key];
                _results.push(this.options[key] = val);
            }
            return _results;
        };
        PSD.prototype.parse = function() {
            Log.debug("Beginning parsing");
            this.startTime = (new Date()).getTime();
            this.parseHeader();
            this.parseImageResources();
            this.parseLayersMasks();
            this.parseImageData();
            this.endTime = (new Date()).getTime();
            return Log.debug("Parsing finished in " + (this.endTime - this.startTime) + "ms");
        };
        PSD.prototype.parseHeader = function() {
            Log.debug("\n### Header ###");
            this.header = new PSDHeader(this.file);
            this.header.parse();
            return Log.debug(this.header);
        };
        PSD.prototype.parseImageResources = function(skip) {
            var length, n, pos, resource, start;
            if (skip == null) {
                skip = false;
            }
            Log.debug("\n### Resources ###");
            this.resources = [];
            n = this.file.readInt();
            length = n;
            if (skip) {
                Log.debug("Skipped!");
                return this.file.seek(n);
            }
            start = this.file.tell();
            while (n > 0) {
                pos = this.file.tell();
                resource = new PSDResource(this.file);
                resource.parse();
                n -= this.file.tell() - pos;
                this.resources.push(resource);
                Log.debug("Resource: ", resource);
            }
            if (n !== 0) {
                Log.debug("Image resources overran expected size by " + (-n) + " bytes");
                return this.file.seek(start + length);
            }
        };
        PSD.prototype.parseLayersMasks = function(skip) {
            if (skip == null) {
                skip = false;
            }
            if (!this.header) {
                this.parseHeader();
            }
            if (!this.resources) {
                this.parseImageResources(true);
            }
            Log.debug("\n### Layers & Masks ###");
            this.layerMask = new PSDLayerMask(this.file, this.header, this.options);
            this.layers = this.layerMask.layers;
            if (skip) {
                Log.debug("Skipped!");
                return this.layerMask.skip();
            } else {
                return this.layerMask.parse();
            }
        };
        PSD.prototype.parseImageData = function() {
            if (!this.header) {
                this.parseHeader();
            }
            if (!this.resources) {
                this.parseImageResources(true);
            }
            if (!this.layerMask) {
                this.parseLayersMasks(true);
            }
            this.image = new PSDImage(this.file, this.header);
            return this.image.parse();
        };
        PSD.prototype.getLayerStructure = function() {
            var layer, parseStack, result, temp, _i, _len, _ref;
            if (!this.layerMask) {
                this.parseLayersMasks();
            }
            result = {layers: []};
            parseStack = [];
            _ref = this.layers;
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                layer = _ref[_i];
                if (layer.isFolder) {
                    parseStack.push(result);
                    result = {name: layer.name,layers: []};
                } else if (layer.isHidden) {
                    temp = result;
                    result = parseStack.pop();
                    result.layers.push(temp);
                } else {
                    result.layers.push(layer);
                }
            }
            return result;
        };
        PSD.prototype.toFile = function(filename, cb) {
            if (cb == null) {
                cb = function() {
                };
            }
            if (!this.image) {
                this.parseImageData();
            }
            return this.image.toFile(filename, cb);
        };
        PSD.prototype.toFileSync = function(filename) {
            if (!this.image) {
                this.parseImageData();
            }
            return this.image.toFileSync(filename);
        };
        PSD.prototype.toCanvas = function(canvas, width, height) {
            if (width == null) {
                width = null;
            }
            if (height == null) {
                height = null;
            }
            if (!this.image) {
                this.parseImageData();
            }
            return this.image.toCanvas(canvas, width, height);
        };
        PSD.prototype.toImage = function() {
            if (!this.image) {
                this.parseImageData();
            }
            return this.image.toImage();
        };
        PSD.prototype.toJSON = function() {
            var data, resource, section, sections, _i, _j, _len, _len1, _ref;
            if (!this.layerMask) {
                this.parseLayersMasks();
            }
            sections = ['header', 'layerMask'];
            data = {resources: []};
            _ref = this.resources;
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                resource = _ref[_i];
                data.resources.push(resource.toJSON());
            }
            for (_j = 0, _len1 = sections.length; _j < _len1; _j++) {
                section = sections[_j];
                data[section] = this[section].toJSON();
            }
            return data;
        };
        return PSD;
    })();
    PSD.PSDColor = PSDColor = (function() {
        function PSDColor() {
        }
        PSDColor.hexToRGB = function(hex) {
            var b, g, r;
            if (hex.charAt(0) === "#") {
                hex = hex.substr(1);
            }
            r = parseInt(hex.substr(0, 2), 16);
            g = parseInt(hex.substr(2, 2), 16);
            b = parseInt(hex.substr(4, 2), 16);
            return {r: r,g: g,b: b};
        };
        PSDColor.rgbToHex = function(c) {
            var m;
            if (arguments.length === 1) {
                m = /rgba?\((\d+), (\d+), (\d+)/.exec(c);
            } else {
                m = Array.prototype.slice.call(arguments);
                m.unshift(0);
            }
            if (m) {
                return '#' + (m[1] << 16 | m[2] << 8 | m[3]).toString(16);
            } else {
                return c;
            }
        };
        PSDColor.rgbToHSL = function(r, g, b) {
            var d, h, l, max, min, s;
            r /= 255;
            g /= 255;
            b /= 255;
            max = Math.max(r, g, b);
            min = Math.min(r, g, b);
            l = (max + min) / 2;
            if (max === min) {
                h = s = 0;
            } else {
                d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                h = (function() {
                    switch (max) {
                        case r:
                            return (g - b) / d + (g < b ? 6 : 0);
                        case g:
                            return (b - r) / d + 2;
                        case b:
                            return (r - g) / d + 4;
                    }
                })();
                h /= 6;
            }
            return {h: Util.round(h, 3),s: Util.round(s, 3),l: Util.round(l, 3)};
        };
        PSDColor.hslToRGB = function(h, s, l) {
            var b, g, p, q, r;
            if (s === 0) {
                r = g = b = l;
            } else {
                q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                p = 2 * l - q;
                r = this.hueToRGB(p, q, h + 1 / 3);
                g = this.hueToRGB(p, q, h);
                b = this.hueToRGB(p, q, h - 1 / 3);
            }
            r *= 255;
            g *= 255;
            b *= 255;
            return {r: Math.round(r),g: Math.round(g),b: Math.round(b)};
        };
        PSDColor.hueToRGB = function(p, q, t) {
            if (t < 0) {
                t += 1;
            }
            if (t > 1) {
                t -= 1;
            }
            if (t < 1 / 6) {
                return p + (q - p) * 6 * t;
            }
            if (t < 1 / 2) {
                return q;
            }
            if (t < 2 / 3) {
                return p + (q - p) * (2 / 3 - t) * 6;
            }
            return p;
        };
        PSDColor.rgbToHSV = function(r, g, b) {
            var d, h, max, min, s, v;
            r /= 255;
            g /= 255;
            b /= 255;
            max = Math.max(r, g, b);
            min = Math.min(r, g, b);
            v = max;
            d = max - min;
            s = max === 0 ? 0 : d / max;
            if (max === min) {
                h = 0;
            } else {
                h = (function() {
                    switch (max) {
                        case r:
                            return (g - b) / d + (g < b ? 6 : 0);
                        case g:
                            return (b - r) / d + 2;
                        case b:
                            return (r - g) / d + 4;
                    }
                })();
                h /= 6;
            }
            return {h: h,s: s,v: v};
        };
        PSDColor.hsvToRGB = function(h, s, v) {
            var b, f, g, i, p, q, r, t;
            i = Math.floor(h * 6);
            f = h * 6 - i;
            p = v * (1 - s);
            q = v * (1 - f * s);
            t = v * (1 - (1 - f) * s);
            switch (i % 6) {
                case 0:
                    r = v;
                    g = t;
                    b = p;
                    break;
                case 1:
                    r = q;
                    g = v;
                    b = p;
                    break;
                case 2:
                    r = p;
                    g = v;
                    b = t;
                    break;
                case 3:
                    r = p;
                    g = q;
                    b = v;
                    break;
                case 4:
                    r = t;
                    g = p;
                    b = v;
                    break;
                case 5:
                    r = v;
                    g = p;
                    b = q;
            }
            return Util.clamp({r: r * 255,g: g * 255,b: b * 255}, 0, 255);
        };
        PSDColor.rgbToXYZ = function(r, g, b) {
            var x, y, z;
            r /= 255;
            g /= 255;
            b /= 255;
            if (r > 0.04045) {
                r = Math.pow((r + 0.055) / 1.055, 2.4);
            } else {
                r /= 12.92;
            }
            if (g > 0.04045) {
                g = Math.pow((g + 0.055) / 1.055, 2.4);
            } else {
                g /= 12.92;
            }
            if (b > 0.04045) {
                b = Math.pow((b + 0.055) / 1.055, 2.4);
            } else {
                b /= 12.92;
            }
            x = r * 0.4124 + g * 0.3576 + b * 0.1805;
            y = r * 0.2126 + g * 0.7152 + b * 0.0722;
            z = r * 0.0193 + g * 0.1192 + b * 0.9505;
            return {x: x * 100,y: y * 100,z: z * 100};
        };
        PSDColor.xyzToRGB = function(x, y, z) {
            var b, g, r;
            x /= 100;
            y /= 100;
            z /= 100;
            r = (3.2406 * x) + (-1.5372 * y) + (-0.4986 * z);
            g = (-0.9689 * x) + (1.8758 * y) + (0.0415 * z);
            b = (0.0557 * x) + (-0.2040 * y) + (1.0570 * z);
            if (r > 0.0031308) {
                r = (1.055 * Math.pow(r, 0.4166666667)) - 0.055;
            } else {
                r *= 12.92;
            }
            if (g > 0.0031308) {
                g = (1.055 * Math.pow(g, 0.4166666667)) - 0.055;
            } else {
                g *= 12.92;
            }
            if (b > 0.0031308) {
                b = (1.055 * Math.pow(b, 0.4166666667)) - 0.055;
            } else {
                b *= 12.92;
            }
            return Util.clamp({r: r * 255,g: g * 255,b: b * 255}, 0, 255);
        };
        PSDColor.xyzToLab = function(x, y, z) {
            var a, b, l, whiteX, whiteY, whiteZ;
            whiteX = 95.047;
            whiteY = 100.0;
            whiteZ = 108.883;
            x /= whiteX;
            y /= whiteY;
            z /= whiteZ;
            if (x > 0.008856451679) {
                x = Math.pow(x, 0.3333333333);
            } else {
                x = (7.787037037 * x) + 0.1379310345;
            }
            if (y > 0.008856451679) {
                y = Math.pow(y, 0.3333333333);
            } else {
                y = (7.787037037 * y) + 0.1379310345;
            }
            if (z > 0.008856451679) {
                z = Math.pow(z, 0.3333333333);
            } else {
                z = (7.787037037 * z) + 0.1379310345;
            }
            l = 116 * y - 16;
            a = 500 * (x - y);
            b = 200 * (y - z);
            return {l: l,a: a,b: b};
        };
        PSDColor.labToXYZ = function(l, a, b) {
            var x, y, z;
            y = (l + 16) / 116;
            x = y + (a / 500);
            z = y - (b / 200);
            if (Math.pow(x, 3) > 0.008856) {
                x = Math.pow(x, 3);
            } else {
                x = (x - 16 / 116) / 7.787;
            }
            if (Math.pow(y, 3) > 0.008856) {
                y = Math.pow(y, 3);
            } else {
                y = (y - 16 / 116) / 7.787;
            }
            if (Math.pow(z, 3) > 0.008856) {
                z = Math.pow(z, 3);
            } else {
                z = (z - 16 / 116) / 7.787;
            }
            return {x: x * 95.047,y: y * 100.0,z: z * 108.883};
        };
        PSDColor.labToRGB = function(l, a, b) {
            var xyz;
            xyz = this.labToXYZ(l, a, b);
            return Util.clamp(this.xyzToRGB(xyz.x, xyz.y, xyz.z), 0, 255);
        };
        PSDColor.cmykToRGB = function(c, m, y, k) {
            var b, g, r;
            r = (65535 - (c * (255 - k) + (k << 8))) >> 8;
            g = (65535 - (m * (255 - k) + (k << 8))) >> 8;
            b = (65535 - (y * (255 - k) + (k << 8))) >> 8;
            return Util.clamp({r: r,g: g,b: b}, 0, 255);
        };
        PSDColor.rgbToColor = function(r, g, b) {
            return this.argbToColor(255, r, g, b);
        };
        PSDColor.argbToColor = function(a, r, g, b) {
            return (alpha << 24) | (r << 16) | (g << 8) | b;
        };
        PSDColor.hsbToColor = function(h, s, b) {
            return this.ahsbToColor(255, h, s, b);
        };
        PSDColor.ahsbToColor = function(alpha, hue, saturation, brightness) {
            var b, g, m1, m2, r;
            if (saturation === 0) {
                b = g = r = 255 * brightness;
            } else {
                if (brightness <= 0.5) {
                    m2 = brightness * (1 + saturation);
                } else {
                    m2 = brightness + saturation - brightness * saturation;
                }
                m1 = 2 * brightness - m2;
                r = this.hueToColor(hue + 120, m1, m2);
                g = this.hueToColor(hue, m1, m2);
                b = this.hueToColor(hue - 120, m1, m2);
            }
            return this.argbToColor(alpha, r, g, b);
        };
        PSDColor.hueToColor = function(hue, m1, m2) {
            var v;
            hue %= 360;
            if (hue < 60) {
                v = m1 + (m2 - m1) * hue / 60;
            } else if (hue < 180) {
                v = m2;
            } else if (hue < 240) {
                v = m1 + (m2 - m1) * (240 - hue) / 60;
            } else {
                v = m1;
            }
            return v * 255;
        };
        PSDColor.cmykToColor = function(cyan, magenta, yellow, black) {
            var b, g, r;
            r = 1 - (cyan * (1 - black) + black) * 255;
            g = 1 - (magenta * (1 - black) + black) * 255;
            b = 1 - (yellow * (1 - black) + black) * 255;
            r = Util.clamp(r, 0, 255);
            g = Util.clamp(g, 0, 255);
            b = Util.clamp(b, 0, 255);
            return this.rgbToColor(r, g, b);
        };
        PSDColor.labToColor = function(l, a, b) {
            return this.alabToColor(255, l, a, b);
        };
        PSDColor.alabToColor = function(alpha, lightness, a, b) {
            var xyz;
            xyz = this.labToXYZ(lightness, a, b);
            return this.axyzToColor(alpha, xyz.x, xyz.y, xyz.z);
        };
        PSDColor.axyzToColor = function(alpha, x, y, z) {
            var rgb;
            rgb = this.xyzToRGB(x, y, z);
            return this.argbToColor(alpha, rgb.r, rgb.g, rgb.b);
        };
        PSDColor.colorSpaceToARGB = function(colorSpace, colorComponent) {
            var dstColor;
            switch (colorSpace) {
                case 0:
                    dstColor = this.rgbToColor(colorComponent[0], colorComponent[1], colorComponent[2]);
                    break;
                case 1:
                    dstColor = this.hsbToColor(colorComponent[0], colorComponent[1] / 100.0, colorComponent[2] / 100.0);
                    break;
                case 2:
                    dstColor = this.cmykToColor(colorComponent[0] / 100.0, colorComponent[1] / 100.0, colorComponent[2] / 100.0, colorComponent[3] / 100.0);
                    break;
                case 7:
                    dstColor = this.labToColor(colorComponent[0], colorComponent[1], colorComponent[2]);
                    break;
                default:
                    dstColor = 0x00FFFFFF;
            }
            return dstColor;
        };
        return PSDColor;
    })();
    PSDDescriptor = (function() {
        function PSDDescriptor(file) {
            this.file = file;
        }
        PSDDescriptor.prototype.parse = function() {
            var data, i, item, numItems, _i;
            Log.debug("Parsing descriptor...");
            data = {};
            data["class"] = this.parseClass();
            numItems = this.file.readInt();
            Log.debug("Descriptor contains " + numItems + " items");
            for (i = _i = 0; 0 <= numItems ? _i < numItems : _i > numItems; i = 0 <= numItems ? ++_i : --_i) {
                item = this.parseKeyItem();
                data[item.id] = item.value;
            }
            return data;
        };
        PSDDescriptor.prototype.parseID = function() {
            var len;
            len = this.file.readInt();
            if (len === 0) {
                return this.file.readInt();
            } else {
                return this.file.readString(len);
            }
        };
        PSDDescriptor.prototype.parseClass = function() {
            return {name: this.file.readUnicodeString(),id: this.parseID()};
        };
        PSDDescriptor.prototype.parseKeyItem = function() {
            return {id: this.parseID(),value: this.parseItem()};
        };
        PSDDescriptor.prototype.parseItem = function() {
            var type, value;
            type = this.file.readString(4);
            Log.debug("Found descriptor type: " + type);
            value = (function() {
                switch (type) {
                    case 'bool':
                        return this.parseBoolean();
                    case 'type':
                    case 'GlbC':
                        return this.parseClass();
                    case 'Objc':
                    case 'GlbO':
                        return this.parse();
                    case 'doub':
                        return this.parseDouble();
                    case 'enum':
                        return this.parseEnum();
                    case 'alis':
                        return this.parseAlias();
                    case 'Pth ':
                        return this.parseFilePath();
                    case 'long':
                        return this.parseInteger();
                    case 'comp':
                        return this.parseLargeInteger();
                    case 'VlLs':
                        return this.parseList();
                    case 'ObAr':
                        return this.parseObjectArray();
                    case 'tdta':
                        return this.parseRawData();
                    case 'obj ':
                        return this.parseReference();
                    case 'TEXT':
                        return this.file.readUnicodeString();
                    case 'UntF':
                        return this.parseUnitDouble();
                }
            }).call(this);
            return value;
        };
        PSDDescriptor.prototype.parseBoolean = function() {
            return this.file.readBoolean();
        };
        PSDDescriptor.prototype.parseDouble = function() {
            return this.file.readDouble();
        };
        PSDDescriptor.prototype.parseInteger = function() {
            return this.file.readInt();
        };
        PSDDescriptor.prototype.parseLargeInteger = function() {
            return this.file.readLongLong();
        };
        PSDDescriptor.prototype.parseIdentifier = function() {
            return this.file.readInt();
        };
        PSDDescriptor.prototype.parseIndex = function() {
            return this.file.readInt();
        };
        PSDDescriptor.prototype.parseOffset = function() {
            return this.file.readInt();
        };
        PSDDescriptor.prototype.parseProperty = function() {
            return this.parseID();
        };
        PSDDescriptor.prototype.parseEnum = function() {
            this.parseID();
            return this.parseID();
        };
        PSDDescriptor.prototype.parseAlias = function() {
            var len;
            len = this.file.readInt();
            return this.file.read(len);
        };
        PSDDescriptor.prototype.parseFilePath = function() {
            var charBytes, len, numChars, path, pathSize, sig, _ref;
            len = this.file.readInt();
            _ref = this.file.readf("<4s2i"), sig = _ref[0], pathSize = _ref[1], numChars = _ref[2];
            charBytes = numChars * 2;
            path = this.file.read(charBytes);
            return {sig: sig,path: path};
        };
        PSDDescriptor.prototype.parseList = function() {
            var i, items, numItems, _i;
            numItems = this.file.readInt();
            items = [];
            for (i = _i = 0; 0 <= numItems ? _i < numItems : _i > numItems; i = 0 <= numItems ? ++_i : --_i) {
                items.push(this.parseItem());
            }
            return items;
        };
        PSDDescriptor.prototype.parseObjectArray = function() {
            var i, item, itemsInObj, j, klass, numItems, obj, _i, _j;
            numItems = this.file.readInt();
            klass = this.parseClass();
            itemsInObj = this.file.readInt();
            obj = [];
            for (i = _i = 0; 0 <= numItems ? _i < numItems : _i > numItems; i = 0 <= numItems ? ++_i : --_i) {
                item = [];
                for (j = _j = 0; 0 <= itemsInObj ? _j < itemsInObj : _j > itemsInObj; j = 0 <= itemsInObj ? ++_j : --_j) {
                    item.push(this.parseObjectArray());
                }
                obj.push(item);
            }
            return obj;
        };
        PSDDescriptor.prototype.parseObjectArray = function() {
            var i, id, num, type, unitID, values, _i;
            id = this.parseID();
            type = this.file.readString(4);
            unitID = this.file.readString();
            num = this.file.readInt();
            values = [];
            for (i = _i = 0; 0 <= num ? _i < num : _i > num; i = 0 <= num ? ++_i : --_i) {
                values.push(this.file.readDouble());
            }
            return values;
        };
        PSDDescriptor.prototype.parseRawData = function() {
            var len;
            len = this.file.readInt();
            return this.file.read(len);
        };
        PSDDescriptor.prototype.parseReference = function() {
            var form, klass, value;
            form = this.file.readString(4);
            klass = this.parseClass();
            value = (function() {
                switch (form) {
                    case "Clss":
                        return null;
                    case "Enmr":
                        return this.parseEnum();
                    case "Idnt":
                        return this.parseIdentifier();
                    case "indx":
                        return this.parseIndex();
                    case "name":
                        return this.file.readUnicodeString();
                    case "rele":
                        return this.parseOffset();
                    case "prop":
                        return this.parseProperty();
                }
            }).call(this);
            return value;
        };
        PSDDescriptor.prototype.parseUnitDouble = function() {
            var unit, unitID, value;
            unitID = this.file.parseString(4);
            unit = (function() {
                switch (unitID) {
                    case "#Ang":
                        return "Angle";
                    case "#Rsl":
                        return "Density";
                    case "#Rlt":
                        return "Distance";
                    case "#Nne":
                        return "None";
                    case "#Prc":
                        return "Percent";
                    case "#Pxl":
                        return "Pixels";
                    case "#Mlm":
                        return "Millimeters";
                    case "#Pnt":
                        return "Points";
                }
            })();
            value = this.file.readDouble();
            return {id: unitID,unit: unit,value: value};
        };
        return PSDDescriptor;
    })();
    PSDFile = (function() {
        PSDFile.prototype.unicodeRegex = /\\u([\d\w]{4})/gi;
        function PSDFile(data) {
            this.data = data;
            this.pos = 0;
        }
        PSDFile.prototype.tell = function() {
            return this.pos;
        };
        PSDFile.prototype.read = function(bytes) {
            var i, _i, _results;
            _results = [];
            for (i = _i = 0; 0 <= bytes ? _i < bytes : _i > bytes; i = 0 <= bytes ? ++_i : --_i) {
                _results.push(this.data[this.pos++]);
            }
            return _results;
        };
        PSDFile.prototype.seek = function(amount, rel) {
            if (rel == null) {
                rel = true;
            }
            if (rel) {
                return this.pos += amount;
            } else {
                return this.pos = amount;
            }
        };
        PSDFile.prototype.readInt = function() {
            var int;
            int = this.readUInt();
            if (int >= 0x80000000) {
                return int - 0x100000000;
            } else {
                return int;
            }
        };
        PSDFile.prototype.readUInt = function() {
            var b1, b2, b3, b4;
            b1 = this.read(1)[0] << 24;
            b2 = this.read(1)[0] << 16;
            b3 = this.read(1)[0] << 8;
            b4 = this.read(1)[0];
            return b1 | b2 | b3 | b4;
        };
        PSDFile.prototype.readShortInt = function() {
            var int;
            int = this.readShortUInt();
            if (int >= 0x8000) {
                return int - 0x10000;
            } else {
                return int;
            }
        };
        PSDFile.prototype.readShortUInt = function() {
            var b1, b2;
            b1 = this.read(1)[0] << 8;
            b2 = this.read(1)[0];
            return b1 | b2;
        };
        PSDFile.prototype.readLongInt = function() {
            return this.readf(">l")[0];
        };
        PSDFile.prototype.readLongUInt = function() {
            return this.readf(">L")[0];
        };
        PSDFile.prototype.readDouble = function() {
            return this.readf(">d")[0];
        };
        PSDFile.prototype.readBoolean = function() {
            return this.read(1)[0] !== 0;
        };
        PSDFile.prototype.readLongLong = function() {
            return this.read(8);
        };
        PSDFile.prototype.readULongLong = function() {
            return this.read(8);
        };
        PSDFile.prototype.readString = function(length) {
            var ret;
            ret = String.fromCharCode.apply(null, this.read(length));
            return ret.replace(/\u0000/g, "");
        };
        PSDFile.prototype.readUnicodeString = function() {
            var len, str;
            len = this.readInt() * 2;
            str = this.readf(">" + len + "s")[0];
            str = str.replace(this.unicodeRegex, function(match, grp) {
                return String.fromCharCode(parseInt(grp, 16));
            });
            return str.replace(/\u0000/g, "");
        };
        PSDFile.prototype.readLengthWithString = function(defaultLen) {
            var length, str;
            if (defaultLen == null) {
                defaultLen = 4;
            }
            length = this.read(1)[0];
            if (length === 0) {
                str = this.readString(defaultLen);
            } else {
                str = this.readString(length);
            }
            return str;
        };
        PSDFile.prototype.readBytesList = function(size) {
            return this.read(size);
        };
        PSDFile.prototype.readSpaceColor = function() {
            var colorComponent, colorSpace, i, _i;
            colorSpace = this.readShortInt();
            colorComponent = [];
            for (i = _i = 0; _i < 4; i = ++_i) {
                colorComponent.push(this.readShortInt() >> 8);
            }
            return PSDColor.colorSpaceToARGB(colorSpace, colorComponent);
        };
        PSDFile.prototype.readf = function(format) {
            return jspack.Unpack(format, this.read(jspack.CalcLength(format)));
        };
        PSDFile.prototype.skipBlock = function(desc) {
            var n;
            if (desc == null) {
                desc = "unknown";
            }
            n = this.readf('>L')[0];
            if (n) {
                this.seek(n);
            }
            return Log.debug("Skipped " + desc + " with " + n + " bytes");
        };
        return PSDFile;
    })();
    PSDHeader = (function() {
        var HEADER_SECTIONS, MODES;
        HEADER_SECTIONS = ["sig", "version", "r0", "r1", "r2", "r3", "r4", "r5", "channels", "rows", "cols", "depth", "mode"];
        MODES = {0: 'Bitmap',1: 'GrayScale',2: 'IndexedColor',3: 'RGBColor',4: 'CMYKColor',5: 'HSLColor',6: 'HSBColor',7: 'Multichannel',8: 'Duotone',9: 'LabColor',10: 'Gray16',11: 'RGB48',12: 'Lab48',13: 'CMYK64',14: 'DeepMultichannel',15: 'Duotone16'};
        function PSDHeader(file) {
            this.file = file;
        }
        PSDHeader.prototype.parse = function() {
            var data, section, _i, _len, _ref;
            data = this.file.readf(">4sH 6B HLLHH");
            for (_i = 0, _len = HEADER_SECTIONS.length; _i < _len; _i++) {
                section = HEADER_SECTIONS[_i];
                this[section] = data.shift();
            }
            this.size = [this.rows, this.cols];

			console.log('this',this);
			
            if (this.sig !== "8BPS") {byte
                throw "Not a PSD signature: " + this.header['sig'];
            }
            if (this.version !== 1) {
                throw "Can not handle PSD version " + this.header['version'];
            }
            if ((0 <= (_ref = this.mode) && _ref < 16)) {
                this.modename = MODES[this.mode];
            } else {
                this.modename = "(" + this.mode + ")";
            }
            this.colormodepos = this.file.pos;
            return this.file.skipBlock("color mode data");
        };
        PSDHeader.prototype.toJSON = function() {
            var data, section, _i, _len;
            data = {};
            for (_i = 0, _len = HEADER_SECTIONS.length; _i < _len; _i++) {
                section = HEADER_SECTIONS[_i];
                data[section] = this[section];
            }
            data.modename = this.modename;
            return data;
        };
        return PSDHeader;
    })();
    PSDImage = (function() {
        var COMPRESSIONS;
        COMPRESSIONS = {0: 'Raw',1: 'RLE',2: 'ZIP',3: 'ZIPPrediction'};
        PSDImage.prototype.channelsInfo = [{id: 0}, {id: 1}, {id: 2}, {id: -1}];
        function PSDImage(file, header) {
            this.file = file;
            this.header = header;
            this.numPixels = this.getImageWidth() * this.getImageHeight();
            if (this.getImageDepth() === 16) {
                this.numPixels *= 2;
            }
            this.calculateLength();
            this.channelData = new Uint8Array(this.length);
            this.startPos = this.file.tell();
            this.endPos = this.startPos + this.length;
            this.pixelData = [];
        }
        PSDImage.prototype.calculateLength = function() {
            this.length = (function() {
                switch (this.getImageDepth()) {
                    case 1:
                        return (this.getImageWidth() + 7) / 8 * this.getImageHeight();
                    case 16:
                        return this.getImageWidth() * this.getImageHeight() * 2;
                    default:
                        return this.getImageWidth() * this.getImageHeight();
                }
            }).call(this);
            this.channelLength = this.length;
            return this.length *= this.getImageChannels();
        };
        PSDImage.prototype.parse = function() {
            var _ref;
            this.compression = this.parseCompression();
            Log.debug("Image size: " + this.length + " (" + (this.getImageWidth()) + "x" + (this.getImageHeight()) + ")");
            if ((_ref = this.compression) === 2 || _ref === 3) {
                Log.debug("ZIP compression not implemented yet, skipping.");
                return this.file.seek(this.endPos, false);
            }
            return this.parseImageData();
        };
        PSDImage.prototype.skip = function() {
            Log.debug("Skipping image data");
            return this.file.seek(this.length);
        };
        PSDImage.prototype.parseCompression = function() {
            return this.file.readShortInt();
        };
        PSDImage.prototype.parseImageData = function() {
            Log.debug("Image compression: id=" + this.compression + ", name=" + COMPRESSIONS[this.compression]);
            switch (this.compression) {
                case 0:
                    this.parseRaw();
                    break;
                case 1:
                    this.parseRLE();
                    break;
                case 2:
                case 3:
                    this.parseZip();
                    break;
                default:
                    Log.debug("Unknown image compression. Attempting to skip.");
                    return this.file.seek(this.endPos, false);
            }
            return this.processImageData();
        };
        PSDImage.prototype.parseRaw = function(length) {
            var i, _i;
            if (length == null) {
                length = this.length;
            }
            Log.debug("Attempting to parse RAW encoded image...");
            for (i = _i = 0; 0 <= length ? _i < length : _i > length; i = 0 <= length ? ++_i : --_i) {
                this.channelData[i] = this.file.read(1)[0];
            }
            return true;
        };
        PSDImage.prototype.parseRLE = function() {
            Log.debug("Attempting to parse RLE encoded image...");
            this.byteCounts = this.getByteCounts();
            Log.debug("Read byte counts. Current pos = " + (this.file.tell()) + ", Pixels = " + this.length);
            return this.parseChannelData();
        };
        PSDImage.prototype.getImageHeight = function() {
            return this.header.rows;
        };
        PSDImage.prototype.getImageWidth = function() {
            return this.header.cols;
        };
        PSDImage.prototype.getImageChannels = function() {
            return this.header.channels;
        };
        PSDImage.prototype.getImageDepth = function() {
            return this.header.depth;
        };
        PSDImage.prototype.getByteCounts = function() {
            var byteCounts, i, j, _i, _j, _ref, _ref1;
            byteCounts = [];
            for (i = _i = 0, _ref = this.getImageChannels(); 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
                for (j = _j = 0, _ref1 = this.getImageHeight(); 0 <= _ref1 ? _j < _ref1 : _j > _ref1; j = 0 <= _ref1 ? ++_j : --_j) {
                    byteCounts.push(this.file.readShortInt());
                }
            }
            return byteCounts;
        };
        PSDImage.prototype.parseChannelData = function() {
            var chanPos, i, lineIndex, _i, _ref, _ref1;
            chanPos = 0;
            lineIndex = 0;
            for (i = _i = 0, _ref = this.getImageChannels(); 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
                Log.debug("Parsing channel #" + i + ", Start = " + (this.file.tell()));
                _ref1 = this.decodeRLEChannel(chanPos, lineIndex), chanPos = _ref1[0], lineIndex = _ref1[1];
            }
            return true;
        };
        PSDImage.prototype.decodeRLEChannel = function(chanPos, lineIndex) {
            var byteCount, data, dataIndex, j, k, len, start, val, z, _i, _j, _k, _l, _ref, _ref1, _ref2;
            for (j = _i = 0, _ref = this.getImageHeight(); 0 <= _ref ? _i < _ref : _i > _ref; j = 0 <= _ref ? ++_i : --_i) {
                byteCount = this.byteCounts[lineIndex++];
                start = this.file.tell();
                while (this.file.tell() < start + byteCount) {
                    len = this.file.read(1)[0];
                    if (len < 128) {
                        len++;
                        data = this.file.read(len);
                        dataIndex = 0;
                        for (k = _j = chanPos, _ref1 = chanPos + len; chanPos <= _ref1 ? _j < _ref1 : _j > _ref1; k = chanPos <= _ref1 ? ++_j : --_j) {
                            this.channelData[k] = data[dataIndex++];
                        }
                        chanPos += len;
                    } else if (len > 128) {
                        len ^= 0xff;
                        len += 2;
                        val = this.file.read(1)[0];
                        data = [];
                        for (z = _k = 0; 0 <= len ? _k < len : _k > len; z = 0 <= len ? ++_k : --_k) {
                            data.push(val);
                        }
                        dataIndex = 0;
                        for (k = _l = chanPos, _ref2 = chanPos + len; chanPos <= _ref2 ? _l < _ref2 : _l > _ref2; k = chanPos <= _ref2 ? ++_l : --_l) {
                            this.channelData[k] = data[dataIndex++];
                        }
                        chanPos += len;
                    }
                }
            }
            return [chanPos, lineIndex];
        };
        PSDImage.prototype.parseZip = function(prediction) {
            if (prediction == null) {
                prediction = false;
            }
            return this.file.seek(this.endPos, false);
        };
        PSDImage.prototype.processImageData = function() {
            Log.debug("Processing parsed image data. " + this.channelData.length + " pixels read.");
            switch (this.header.mode) {
                case 1:
                    if (this.getImageDepth() === 8) {
                        this.combineGreyscale8Channel();
                    }
                    if (this.getImageDepth() === 16) {
                        this.combineGreyscale16Channel();
                    }
                    break;
                case 3:
                    if (this.getImageDepth() === 8) {
                        this.combineRGB8Channel();
                    }
                    if (this.getImageDepth() === 16) {
                        this.combineRGB16Channel();
                    }
                    break;
                case 4:
                    if (this.getImageDepth() === 8) {
                        this.combineCMYK8Channel();
                    }
                    if (this.getImageDepth() === 16) {
                        this.combineCMYK16Channel();
                    }
                    break;
                case 7:
                    this.combineMultiChannel8();
                    break;
                case 9:
                    if (this.getImageDepth() === 8) {
                        this.combineLAB8Channel();
                    }
                    if (this.getImageDepth() === 16) {
                        this.combineLAB16Channel();
                    }
            }
            return delete this.channelData;
        };
        PSDImage.prototype.getAlphaValue = function(alpha) {
            if (alpha == null) {
                alpha = 255;
            }
            if (this.layer != null) {
                alpha = alpha * (this.layer.blendMode.opacity / 255);
            }
            return alpha;
        };
        PSDImage.prototype.combineGreyscale8Channel = function() {
            var alpha, grey, i, _i, _j, _ref, _ref1, _results, _results1;
            if (this.getImageChannels() === 2) {
                _results = [];
                for (i = _i = 0, _ref = this.numPixels; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
                    alpha = this.channelData[i];
                    grey = this.channelData[this.channelLength + i];
                    _results.push(this.pixelData.push(grey, grey, grey, this.getAlphaValue(alpha)));
                }
                return _results;
            } else {
                _results1 = [];
                for (i = _j = 0, _ref1 = this.numPixels; 0 <= _ref1 ? _j < _ref1 : _j > _ref1; i = 0 <= _ref1 ? ++_j : --_j) {
                    _results1.push(this.pixelData.push(this.channelData[i], this.channelData[i], this.channelData[i], this.getAlphaValue()));
                }
                return _results1;
            }
        };
        PSDImage.prototype.combineGreyscale16Channel = function() {
            var alpha, grey, i, pixel, _i, _j, _ref, _ref1, _results, _results1;
            if (this.getImageChannels() === 2) {
                _results = [];
                for (i = _i = 0, _ref = this.numPixels; _i < _ref; i = _i += 2) {
                    alpha = Util.toUInt16(this.channelData[i + 1], this.channelData[i]);
                    grey = Util.toUInt16(this.channelData[this.channelLength + i + 1], this.channelData[this.channelLength + i]);
                    _results.push(this.pixelData.push(grey, grey, grey, this.getAlphaValue(alpha)));
                }
                return _results;
            } else {
                _results1 = [];
                for (i = _j = 0, _ref1 = this.numPixels; _j < _ref1; i = _j += 2) {
                    pixel = Util.toUInt16(this.channelData[i + 1], this.channelData[i]);
                    _results1.push(this.pixelData.push(pixel, pixel, pixel, this.getAlphaValue()));
                }
                return _results1;
            }
        };
        PSDImage.prototype.combineRGB8Channel = function() {
            var chan, i, index, pixel, _i, _j, _len, _ref, _ref1, _results;
            _results = [];
            for (i = _i = 0, _ref = this.numPixels; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
                index = 0;
                pixel = {r: 0,g: 0,b: 0,a: 255};
                _ref1 = this.channelsInfo;
                for (_j = 0, _len = _ref1.length; _j < _len; _j++) {
                    chan = _ref1[_j];
                    switch (chan.id) {
                        case -1:
                            if (this.getImageChannels() === 4) {
                                pixel.a = this.channelData[i + (this.channelLength * index)];
                            } else {
                                continue;
                            }
                            break;
                        case 0:
                            pixel.r = this.channelData[i + (this.channelLength * index)];
                            break;
                        case 1:
                            pixel.g = this.channelData[i + (this.channelLength * index)];
                            break;
                        case 2:
                            pixel.b = this.channelData[i + (this.channelLength * index)];
                    }
                    index++;
                }
                _results.push(this.pixelData.push(pixel.r, pixel.g, pixel.b, this.getAlphaValue(pixel.a)));
            }
            return _results;
        };
        PSDImage.prototype.combineRGB16Channel = function() {
            var b1, b2, chan, i, index, pixel, _i, _j, _len, _ref, _ref1, _results;
            _results = [];
            for (i = _i = 0, _ref = this.numPixels; _i < _ref; i = _i += 2) {
                index = 0;
                pixel = {r: 0,g: 0,b: 0,a: 255};
                _ref1 = this.channelsInfo;
                for (_j = 0, _len = _ref1.length; _j < _len; _j++) {
                    chan = _ref1[_j];
                    b1 = this.channelData[i + (this.channelLength * index) + 1];
                    b2 = this.channelData[i + (this.channelLength * index)];
                    switch (chan.id) {
                        case -1:
                            if (this.getImageChannels() === 4) {
                                pixel.a = Util.toUInt16(b1, b2);
                            } else {
                                continue;
                            }
                            break;
                        case 0:
                            pixel.r = Util.toUInt16(b1, b2);
                            break;
                        case 1:
                            pixel.g = Util.toUInt16(b1, b2);
                            break;
                        case 2:
                            pixel.b = Util.toUInt16(b1, b2);
                    }
                    index++;
                }
                _results.push(this.pixelData.push(pixel.r, pixel.g, pixel.b, this.getAlphaValue(pixel.a)));
            }
            return _results;
        };
        PSDImage.prototype.combineCMYK8Channel = function() {
            var a, c, i, k, m, rgb, y, _i, _ref, _results;
            _results = [];
            for (i = _i = 0, _ref = this.numPixels; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
                if (this.getImageChannels() === 5) {
                    a = this.channelData[i];
                    c = this.channelData[i + this.channelLength];
                    m = this.channelData[i + this.channelLength * 2];
                    y = this.channelData[i + this.channelLength * 3];
                    k = this.channelData[i + this.channelLength * 4];
                } else {
                    a = 255;
                    c = this.channelData[i];
                    m = this.channelData[i + this.channelLength];
                    y = this.channelData[i + this.channelLength * 2];
                    k = this.channelData[i + this.channelLength * 3];
                }
                rgb = PSDColor.cmykToRGB(255 - c, 255 - m, 255 - y, 255 - k);
                _results.push(this.pixelData.push(rgb.r, rgb.g, rgb.b, this.getAlphaValue(a)));
            }
            return _results;
        };
        PSDImage.prototype.combineCMYK16Channel = function() {
            var a, c, i, k, m, rgb, y, _i, _ref, _results;
            _results = [];
            for (i = _i = 0, _ref = this.numPixels; _i < _ref; i = _i += 2) {
                if (this.getImageChannels() === 5) {
                    a = this.channelData[i];
                    c = this.channelData[i + this.channelLength];
                    m = this.channelData[i + this.channelLength * 2];
                    y = this.channelData[i + this.channelLength * 3];
                    k = this.channelData[i + this.channelLength * 3];
                } else {
                    a = 255;
                    c = this.channelData[i];
                    m = this.channelData[i + this.channelLength];
                    y = this.channelData[i + this.channelLength * 2];
                    k = this.channelData[i + this.channelLength * 3];
                }
                rgb = PSDColor.cmykToRGB(255 - c, 255 - m, 255 - y, 255 - k);
                _results.push(this.pixelData.push(rgb.r, rgb.g, rgb.b, this.getAlphaValue(a)));
            }
            return _results;
        };
        PSDImage.prototype.combineLAB8Channel = function() {
            var a, alpha, b, i, l, rgb, _i, _ref, _results;
            _results = [];
            for (i = _i = 0, _ref = this.numPixels; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
                if (this.getImageChannels() === 4) {
                    alpha = this.channelData[i];
                    l = this.channelData[i + this.channelLength];
                    a = this.channelData[i + this.channelLength * 2];
                    b = this.channelData[i + this.channelLength * 3];
                } else {
                    alpha = 255;
                    l = this.channelData[i];
                    a = this.channelData[i + this.channelLength];
                    b = this.channelData[i + this.channelLength * 2];
                }
                rgb = PSDColor.labToRGB(l * 100 >> 8, a - 128, b - 128);
                _results.push(this.pixelData.push(rgb.r, rgb.g, rgb.b, this.getAlphaValue(alpha)));
            }
            return _results;
        };
        PSDImage.prototype.combineLAB16Channel = function() {
            var a, alpha, b, i, l, rgb, _i, _ref, _results;
            _results = [];
            for (i = _i = 0, _ref = this.numPixels; _i < _ref; i = _i += 2) {
                if (this.getImageChannels() === 4) {
                    alpha = this.channelData[i];
                    l = this.channelData[i + this.channelLength];
                    a = this.channelData[i + this.channelLength * 2];
                    b = this.channelData[i + this.channelLength * 3];
                } else {
                    alpha = 255;
                    l = this.channelData[i];
                    a = this.channelData[i + this.channelLength];
                    b = this.channelData[i + this.channelLength * 2];
                }
                rgb = PSDColor.labToRGB(l * 100 >> 8, a - 128, b - 128);
                _results.push(this.pixelData.push(rgb.r, rgb.g, rgb.b, this.getAlphaValue(alpha)));
            }
            return _results;
        };
        PSDImage.prototype.combineMultiChannel8 = function() {
            var c, i, k, m, rgb, y, _i, _ref, _results;
            _results = [];
            for (i = _i = 0, _ref = this.numPixels; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
                c = this.channelData[i];
                m = this.channelData[i + this.channelLength];
                y = this.channelData[i + this.channelLength * 2];
                if (this.getImageChannels() === 4) {
                    k = this.channelData[i + this.channelLength * 3];
                } else {
                    k = 255;
                }
                rgb = PSDColor.cmykToRGB(255 - c, 255 - m, 255 - y, 255 - k);
                _results.push(this.pixelData.push(rgb.r, rgb.g, rgb.b, this.getAlphaValue(255)));
            }
            return _results;
        };
        PSDImage.prototype.toCanvasPixels = function() {
            return this.pixelData;
        };
        PSDImage.prototype.toFile = function(filename, cb) {
            var png;
            if (this.toCanvasPixels().length === 0) {
                return cb();
            }
            png = this.getPng();
            if (png === null) {
                return cb();
            }
            return png.encode(function(image) {
                return fs.writeFile(filename, image, cb);
            });
        };
        PSDImage.prototype.toFileSync = function(filename) {
            var image, png;
            if (this.toCanvasPixels().length === 0) {
                return;
            }
            png = this.getPng();
            if (png === null) {
                return;
            }
            image = png.encodeSync();
            return fs.writeFileSync(filename, image);
        };
        PSDImage.prototype.getPng = function() {
            var Png, buffer, i, pixelData, _i, _ref;
            try {
                Png = require('png').Png;
            } catch (e) {
                throw "Exporting PSDs to file requires the node-png library";
            }
            buffer = new Buffer(this.toCanvasPixels().length);
            pixelData = this.toCanvasPixels();
            for (i = _i = 0, _ref = pixelData.length; _i < _ref; i = _i += 4) {
                buffer[i] = pixelData[i];
                buffer[i + 1] = pixelData[i + 1];
                buffer[i + 2] = pixelData[i + 2];
                buffer[i + 3] = 255 - pixelData[i + 3];
            }
            try {
                return new Png(buffer, this.getImageWidth(), this.getImageHeight(), 'rgba');
            } catch (e) {
                Log.debug(e);
                return null;
            }
        };
        PSDImage.prototype.toCanvas = function(canvas, width, height) {
            var context, i, imageData, pixelData, pxl, _i, _len, _ref;
            if (width == null) {
                width = this.getImageWidth();
            }
            if (height == null) {
                height = this.getImageHeight();
            }
            if (!(width != null) || !(height != null) || width <= 0 || height <= 0) {
                throw "Layer does not contain image data";
            }
            canvas.width = width;
            canvas.height = height;
            context = canvas.getContext('2d');
            imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            pixelData = imageData.data;
            _ref = this.toCanvasPixels();
            for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
                pxl = _ref[i];
                pixelData[i] = pxl;
            }
            return context.putImageData(imageData, 0, 0);
        };
        PSDImage.prototype.toImage = function() {
            var canvas;
            canvas = document.createElement('canvas');
            this.toCanvas(canvas);
            return canvas.toDataURL("image/png");
        };
        return PSDImage;
    })();
    PSDChannelImage = (function(_super) {
        __extends(PSDChannelImage, _super);
        function PSDChannelImage(file, header, layer) {
            this.layer = layer;
            this.width = this.layer.cols;
            this.height = this.layer.rows;
            this.channelsInfo = this.layer.channelsInfo;
            PSDChannelImage.__super__.constructor.call(this, file, header);
        }
        PSDChannelImage.prototype.skip = function() {
            var channel, _i, _len, _ref, _results;
            Log.debug("Skipping channel image data. Layer = " + this.layer.name);
            _ref = this.channelsInfo;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                channel = _ref[_i];
                _results.push(this.file.seek(channel.length));
            }
            return _results;
        };
        PSDChannelImage.prototype.getImageWidth = function() {
            return this.width;
        };
        PSDChannelImage.prototype.getImageHeight = function() {
            return this.height;
        };
        PSDChannelImage.prototype.getImageChannels = function() {
            return this.layer.channels;
        };
        PSDChannelImage.prototype.getByteCounts = function() {
            var byteCounts, i, _i, _ref;
            byteCounts = [];
            for (i = _i = 0, _ref = this.getImageHeight(); 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
                byteCounts.push(this.file.readShortInt());
            }
            return byteCounts;
        };
        PSDChannelImage.prototype.parse = function() {
            var end, i, memusage, start, total, used, _i, _ref;
            Log.debug("\nLayer: " + this.layer.name + ", image size: " + this.length + " (" + (this.getImageWidth()) + "x" + (this.getImageHeight()) + ")");
            this.chanPos = 0;
            for (i = _i = 0, _ref = this.getImageChannels(); 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
                this.chInfo = this.layer.channelsInfo[i];
                if (this.chInfo.length <= 0) {
                    this.parseCompression();
                    continue;
                }
                if (this.chInfo.id === -2) {
                    this.width = this.layer.mask.width;
                    this.height = this.layer.mask.height;
                } else {
                    this.width = this.layer.cols;
                    this.height = this.layer.rows;
                }
                start = this.file.tell();
                Log.debug("Channel #" + this.chInfo.id + ": length=" + this.chInfo.length);
                this.parseImageData();
                end = this.file.tell();
                if (end !== start + this.chInfo.length) {
                    Log.debug("ERROR: read incorrect number of bytes for channel #" + this.chInfo.id + ". Layer=" + this.layer.name + ", Expected = " + (start + this.chInfo.length) + ", Actual: " + end);
                    this.file.seek(start + this.chInfo.length, false);
                }
            }
            if (this.channelData.length !== this.length) {
                Log.debug("ERROR: " + this.channelData.length + " read; expected " + this.length);
            }
            this.processImageData();
            if (typeof exports !== "undefined" && exports !== null) {
                memusage = process.memoryUsage();
                used = Math.round(memusage.heapUsed / 1024 / 1024);
                total = Math.round(memusage.heapTotal / 1024 / 1024);
                return Log.debug("\nMemory usage: " + used + "MB / " + total + "MB");
            }
        };
        PSDChannelImage.prototype.parseRaw = function() {
            var data, dataIndex, i, _i, _ref, _ref1;
            Log.debug("Attempting to parse RAW encoded channel...");
            data = this.file.read(this.chInfo.length - 2);
            dataIndex = 0;
            for (i = _i = _ref = this.chanPos, _ref1 = this.chanPos + this.chInfo.length - 2; _ref <= _ref1 ? _i < _ref1 : _i > _ref1; i = _ref <= _ref1 ? ++_i : --_i) {
                this.channelData[i] = data[dataIndex++];
            }
            return this.chanPos += this.chInfo.length - 2;
        };
        PSDChannelImage.prototype.parseImageData = function() {
            this.compression = this.parseCompression();
            switch (this.compression) {
                case 0:
                    return this.parseRaw();
                case 1:
                    return this.parseRLE();
                case 2:
                case 3:
                    return this.parseZip();
                default:
                    Log.debug("Unknown image compression. Attempting to skip.");
                    return this.file.seek(this.endPos, false);
            }
        };
        PSDChannelImage.prototype.parseChannelData = function() {
            var lineIndex, _ref;
            lineIndex = 0;
            Log.debug("Parsing layer channel #" + this.chInfo.id + ", Start = " + (this.file.tell()));
            return _ref = this.decodeRLEChannel(this.chanPos, lineIndex), this.chanPos = _ref[0], lineIndex = _ref[1], _ref;
        };
        return PSDChannelImage;
    })(PSDImage);
    PSDLayer = (function() {
        var BLEND_FLAGS, BLEND_MODES, CHANNEL_SUFFIXES, MASK_FLAGS, SAFE_FONTS, SECTION_DIVIDER_TYPES;
        CHANNEL_SUFFIXES = {'-2': 'layer mask','-1': 'A',0: 'R',1: 'G',2: 'B',3: 'RGB',4: 'CMYK',5: 'HSL',6: 'HSB',9: 'Lab',11: 'RGB',12: 'Lab',13: 'CMYK'};
        SECTION_DIVIDER_TYPES = {0: "other",1: "open folder",2: "closed folder",3: "bounding section divider"};
        BLEND_MODES = {"norm": "normal","dark": "darken","lite": "lighten","hue": "hue","sat": "saturation","colr": "color","lum": "luminosity","mul": "multiply","scrn": "screen","diss": "dissolve","over": "overlay","hLit": "hard light","sLit": "soft light","diff": "difference","smud": "exclusion","div": "color dodge","idiv": "color burn","lbrn": "linear burn","lddg": "linear dodge","vLit": "vivid light","lLit": "linear light","pLit": "pin light","hMix": "hard mix"};
        BLEND_FLAGS = {0: "transparency protected",1: "visible",2: "obsolete",3: "bit 4 useful",4: "pixel data irrelevant"};
        MASK_FLAGS = {0: "position relative",1: "layer mask disabled",2: "invert layer mask"};
        SAFE_FONTS = ["Arial", "Courier New", "Georgia", "Times New Roman", "Verdana", "Trebuchet MS", "Lucida Sans", "Tahoma"];
        function PSDLayer(file, header) {
            this.file = file;
            this.header = header != null ? header : null;
            this.image = null;
            this.mask = {};
            this.blendingRanges = {};
            this.adjustments = {};
            this.layerType = "normal";
            this.blendingMode = "normal";
            this.opacity = 255;
            this.fillOpacity = 255;
            this.isFolder = false;
            this.isHidden = false;
        }
        PSDLayer.prototype.parse = function(layerIndex) {
            var extralen, extrastart, result;
            if (layerIndex == null) {
                layerIndex = null;
            }
            this.parseInfo(layerIndex);
            this.parseBlendModes();
            extralen = this.file.readInt();
            this.layerEnd = this.file.tell() + extralen;
            assert(extralen > 0);
            extrastart = this.file.tell();
            result = this.parseMaskData();
            if (!result) {
                Log.debug("Error parsing mask data for layer #" + layerIndex + ". Skipping.");
                return this.file.seek(this.layerEnd, false);
            }
            this.parseBlendingRanges();
            this.parseLegacyLayerName();
            this.parseExtraData();
            if (this.name == null) {
                this.name = this.legacyName;
            }
            Log.debug("Layer " + layerIndex + ":", this);
            return this.file.seek(extrastart + extralen, false);
        };
        PSDLayer.prototype.parseInfo = function(layerIndex) {
            var channelID, channelLength, i, _i, _ref, _ref1, _ref2, _ref3, _results;
            this.idx = layerIndex;
            _ref = this.file.readf(">iiiih"), this.top = _ref[0], this.left = _ref[1], this.bottom = _ref[2], this.right = _ref[3], this.channels = _ref[4];
            _ref1 = [this.bottom - this.top, this.right - this.left], this.rows = _ref1[0], this.cols = _ref1[1];
            assert(this.channels > 0);
            this.height = this.rows;
            this.width = this.cols;
            if (this.bottom < this.top || this.right < this.left || this.channels > 64) {
                Log.debug("Somethings not right, attempting to skip layer.");
                this.file.seek(6 * this.channels + 12);
                this.file.skipBlock("layer info: extra data");
                return;
            }
            this.channelsInfo = [];
            _results = [];
            for (i = _i = 0, _ref2 = this.channels; 0 <= _ref2 ? _i < _ref2 : _i > _ref2; i = 0 <= _ref2 ? ++_i : --_i) {
                _ref3 = this.file.readf(">hi"), channelID = _ref3[0], channelLength = _ref3[1];
                Log.debug("Channel " + i + ": id=" + channelID + ", " + channelLength + " bytes, type=" + CHANNEL_SUFFIXES[channelID]);
                _results.push(this.channelsInfo.push({id: channelID,length: channelLength}));
            }
            return _results;
        };
        PSDLayer.prototype.parseBlendModes = function() {
            var filler, flags, _ref;
            this.blendMode = {};
            _ref = this.file.readf(">4s4sBBBB"), this.blendMode.sig = _ref[0], this.blendMode.key = _ref[1], this.blendMode.opacity = _ref[2], this.blendMode.clipping = _ref[3], flags = _ref[4], filler = _ref[5];
            assert(this.blendMode.sig === "8BIM");
            this.blendMode.key = this.blendMode.key.trim();
            this.blendMode.opacityPercentage = (this.blendMode.opacity * 100) / 255;
            this.blendMode.blender = BLEND_MODES[this.blendMode.key];
            this.blendMode.transparencyProtected = flags & 0x01;
            this.blendMode.visible = (flags & (0x01 << 1)) > 0;
            this.blendMode.visible = 1 - this.blendMode.visible;
            this.blendMode.obsolete = (flags & (0x01 << 2)) > 0;
            if ((flags & (0x01 << 3)) > 0) {
                this.blendMode.pixelDataIrrelevant = (flags & (0x01 << 4)) > 0;
            }
            this.blendingMode = this.blendMode.blender;
            this.opacity = this.blendMode.opacity;
            this.visible = this.blendMode.visible;
            return Log.debug("Blending mode:", this.blendMode);
        };
        PSDLayer.prototype.parseMaskData = function() {
            var flags, _ref, _ref1, _ref2, _ref3;
            this.mask.size = this.file.readInt();
            assert((_ref = this.mask.size) === 36 || _ref === 20 || _ref === 0);
            if (this.mask.size === 0) {
                return true;
            }
            _ref1 = this.file.readf(">llllBB"), this.mask.top = _ref1[0], this.mask.left = _ref1[1], this.mask.bottom = _ref1[2], this.mask.right = _ref1[3], this.mask.defaultColor = _ref1[4], flags = _ref1[5];
            assert((_ref2 = this.mask.defaultColor) === 0 || _ref2 === 255);
            this.mask.width = this.mask.right - this.mask.left;
            this.mask.height = this.mask.bottom - this.mask.top;
            this.mask.relative = flags & 0x01;
            this.mask.disabled = (flags & (0x01 << 1)) > 0;
            this.mask.invert = (flags & (0x01 << 2)) > 0;
            if (this.mask.size === 20) {
                this.file.seek(2);
            } else {
                _ref3 = this.file.readf(">BB"), flags = _ref3[0], this.mask.defaultColor = _ref3[1];
                this.mask.relative = flags & 0x01;
                this.mask.disabled = (flags & (0x01 << 1)) > 0;
                this.mask.invert = (flags & (0x01 << 2)) > 0;
                this.file.seek(16);
            }
            return true;
        };
        PSDLayer.prototype.parseBlendingRanges = function() {
            var i, length, pos, _i, _ref, _results;
            length = this.file.readInt();
            this.blendingRanges.grey = {source: {black: this.file.readShortInt(),white: this.file.readShortInt()},dest: {black: this.file.readShortInt(),white: this.file.readShortInt()}};
            pos = this.file.tell();
            this.blendingRanges.numChannels = (length - 8) / 8;
            assert(this.blendingRanges.numChannels > 0);
            this.blendingRanges.channels = [];
            _results = [];
            for (i = _i = 0, _ref = this.blendingRanges.numChannels; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
                _results.push(this.blendingRanges.channels.push({source: {black: this.file.readShortInt(),white: this.file.readShortInt()},dest: {black: this.file.readShortInt(),white: this.file.readShortInt()}}));
            }
            return _results;
        };
        PSDLayer.prototype.parseLegacyLayerName = function() {
            var namelen;
            namelen = Util.pad4(this.file.read(1)[0]);
            return this.legacyName = Util.decodeMacroman(this.file.read(namelen)).replace(/\u0000/g, '');
        };
        PSDLayer.prototype.parseExtraData = function() {
            var key, length, pos, signature, _ref, _results;
            _results = [];
            while (this.file.tell() < this.layerEnd) {
                _ref = this.file.readf(">4s4s"), signature = _ref[0], key = _ref[1];
                assert.equal(signature, "8BIM");
                length = Util.pad2(this.file.readInt());
                pos = this.file.tell();
                Log.debug("Extra layer info: key = " + key + ", length = " + length);
                switch (key) {
                    case "SoCo":
                        this.adjustments.solidColor = (new PSDSolidColor(this, length)).parse();
                        break;
                    case "GdFl":
                        this.adjustments.gradient = (new PSDGradient(this, length)).parse();
                        break;
                    case "PtFl":
                        this.adjustments.pattern = (new PSDPattern(this, length)).parse();
                        break;
                    case "brit":
                        this.adjustments.brightnessContrast = (new PSDBrightnessContrast(this, length)).parse();
                        break;
                    case "levl":
                        this.adjustments.levels = (new PSDLevels(this, length)).parse();
                        break;
                    case "curv":
                        this.adjustments.curves = (new PSDCurves(this, length)).parse();
                        break;
                    case "expA":
                        this.adjustments.exposure = (new PSDExposure(this, length)).parse();
                        break;
                    case "vibA":
                        this.adjustments.vibrance = (new PSDVibrance(this, length)).parse();
                        break;
                    case "hue2":
                        this.adjustments.hueSaturation = (new PSDHueSaturation(this, length)).parse();
                        break;
                    case "blnc":
                        this.adjustments.colorBalance = (new PSDColorBalance(this, length)).parse();
                        break;
                    case "blwh":
                        this.adjustments.blackWhite = (new PSDBlackWhite(this, length)).parse();
                        break;
                    case "phfl":
                        this.adjustments.photoFilter = (new PSDPhotoFilter(this, length)).parse();
                        break;
                    case "thrs":
                        this.adjustments.threshold = (new PSDThreshold(this, length)).parse();
                        break;
                    case "nvrt":
                        this.adjustments.invert = (new PSDInvert(this, length)).parse();
                        break;
                    case "post":
                        this.adjustments.posterize = (new PSDPosterize(this, length)).parse();
                        break;
                    case "tySh":
                        this.adjustments.typeTool = (new PSDTypeTool(this, length)).parse(true);
                        break;
                    case "TySh":
                        this.adjustments.typeTool = (new PSDTypeTool(this, length)).parse();
                        break;
                    case "luni":
                        this.name = this.file.readUnicodeString();
                        this.file.seek(pos + length, false);
                        break;
                    case "lyid":
                        this.layerId = this.file.readInt();
                        break;
                    case "lsct":
                        this.readLayerSectionDivider();
                        break;
                    case "lrFX":
                        this.parseEffectsLayer();
                        this.file.read(2);
                        break;
                    case "selc":
                        this.adjustments.selectiveColor = (new PSDSelectiveColor(this, length)).parse();
                        break;
                    default:
                        this.file.seek(length);
                        Log.debug("Skipping additional layer info with key " + key);
                }
                if (this.file.tell() !== (pos + length)) {
                    Log.debug("Warning: additional layer info with key " + key + " - unexpected end");
                    _results.push(this.file.seek(pos + length, false));
                } else {
                    _results.push(void 0);
                }
            }
            return _results;
        };
        PSDLayer.prototype.parseEffectsLayer = function() {
            var count, data, effect, effects, left, pos, signature, size, type, v, _ref, _ref1;
            effects = [];
            _ref = this.file.readf(">HH"), v = _ref[0], count = _ref[1];
            while (count-- > 0) {
                _ref1 = this.file.readf(">4s4s"), signature = _ref1[0], type = _ref1[1];
                size = this.file.readf(">i")[0];
                pos = this.file.tell();
                Log.debug("Parsing effect layer with type " + type + " and size " + size);
                effect = (function() {
                    switch (type) {
                        case "cmnS":
                            return new PSDLayerEffectCommonStateInfo(this.file);
                        case "dsdw":
                            return new PSDDropDownLayerEffect(this.file);
                        case "isdw":
                            return new PSDDropDownLayerEffect(this.file, true);
                    }
                }).call(this);
                data = effect != null ? effect.parse() : void 0;
                left = (pos + size) - this.file.tell();
                if (left !== 0) {
                    Log.debug("Failed to parse effect layer with type " + type);
                    this.file.seek(left);
                } else {
                    if (type !== "cmnS") {
                        effects.push(data);
                    }
                }
            }
            return this.adjustments.effects = effects;
        };
        PSDLayer.prototype.readLayerSectionDivider = function() {
            var code;
            code = this.file.readInt();
            this.layerType = SECTION_DIVIDER_TYPES[code];
            Log.debug("Layer type:", this.layerType);
            switch (code) {
                case 1:
                case 2:
                    return this.isFolder = true;
                case 3:
                    return this.isHidden = true;
            }
        };
        PSDLayer.prototype.toJSON = function() {
            var data, section, sections, _i, _len;
            sections = ['name', 'legacyName', 'top', 'left', 'bottom', 'right', 'channels', 'rows', 'cols', 'channelsInfo', 'mask', 'layerType', 'blendMode', 'adjustments', 'visible'];
            data = {};
            for (_i = 0, _len = sections.length; _i < _len; _i++) {
                section = sections[_i];
                data[section] = this[section];
            }
            return data;
        };
        return PSDLayer;
    })();
    PSDLayerMask = (function() {
        function PSDLayerMask(file, header, options) {
            this.file = file;
            this.header = header;
            this.options = options;
            this.layers = [];
            this.mergedAlpha = false;
            this.globalMask = {};
            this.extras = [];
        }
        PSDLayerMask.prototype.skip = function() {
            return this.file.seek(this.file.readInt());
        };
        PSDLayerMask.prototype.parse = function() {
            var endLoc, i, layer, layerInfoSize, maskSize, pos, _i, _j, _len, _ref, _ref1;
            maskSize = this.file.readInt();
            endLoc = this.file.tell() + maskSize;
            Log.debug("Layer mask size is " + maskSize);
            if (maskSize <= 0) {
                return;
            }
            layerInfoSize = Util.pad2(this.file.readInt());
            pos = this.file.tell();
            if (layerInfoSize > 0) {
                this.numLayers = this.file.readShortInt();
                if (this.numLayers < 0) {
                    Log.debug("Note: first alpha channel contains transparency data");
                    this.numLayers = Math.abs(this.numLayers);
                    this.mergedAlpha = true;
                }
                if (this.numLayers * (18 + 6 * this.header.channels) > layerInfoSize) {
                    throw "Unlikely number of " + this.numLayers + " layers for " + this.header['channels'] + " with " + layerInfoSize + " layer info size. Giving up.";
                }
                Log.debug("Found " + this.numLayers + " layer(s)");
                for (i = _i = 0, _ref = this.numLayers; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
                    layer = new PSDLayer(this.file);
                    layer.parse(i);
                    this.layers.push(layer);
                }
                _ref1 = this.layers;
                for (_j = 0, _len = _ref1.length; _j < _len; _j++) {
                    layer = _ref1[_j];
                    if (layer.isFolder || layer.isHidden) {
                        this.file.seek(8);
                        continue;
                    }
                    layer.image = new PSDChannelImage(this.file, this.header, layer);
                    if (this.options.layerImages && ((this.options.onlyVisibleLayers && layer.visible) || !this.options.onlyVisibleLayers)) {
                        layer.image.parse();
                    } else {
                        layer.image.skip();
                    }
                }
                this.layers.reverse();
                this.groupLayers();
            }
            this.file.seek(pos + layerInfoSize, false);
            this.parseGlobalMask();
            this.file.seek(endLoc, false);
        };
        PSDLayerMask.prototype.parseGlobalMask = function() {
            var end, i, length, start, _i;
            length = this.file.readInt();
            if (length === 0) {
                return;
            }
            start = this.file.tell();
            end = this.file.tell() + length;
            Log.debug("Global mask length: " + length);
            this.globalMask.overlayColorSpace = this.file.readShortInt();
            this.globalMask.colorComponents = [];
            for (i = _i = 0; _i < 4; i = ++_i) {
                this.globalMask.colorComponents.push(this.file.readShortInt() >> 8);
            }
            this.globalMask.opacity = this.file.readShortInt();
            this.globalMask.kind = this.file.read(1)[0];
            Log.debug("Global mask:", this.globalMask);
            return this.file.seek(end, false);
        };
        PSDLayerMask.prototype.parseExtraInfo = function(end) {
            var key, length, sig, _ref, _results;
            _results = [];
            while (this.file.tell() < end) {
                _ref = this.file.readf(">4s4sI"), sig = _ref[0], key = _ref[1], length = _ref[2];
                length = Util.pad2(length);
                Log.debug("Layer extra:", sig, key, length);
                _results.push(this.file.seek(length));
            }
            return _results;
        };
        PSDLayerMask.prototype.groupLayers = function() {
            var groupLayer, layer, _i, _len, _ref, _results;
            groupLayer = null;
            _ref = this.layers;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                layer = _ref[_i];
                if (layer.isFolder) {
                    _results.push(groupLayer = layer);
                } else if (layer.isHidden) {
                    _results.push(groupLayer = null);
                } else {
                    _results.push(layer.groupLayer = groupLayer);
                }
            }
            return _results;
        };
        PSDLayerMask.prototype.toJSON = function() {
            var data, layer, _i, _len, _ref;
            data = {mergedAlpha: this.mergedAlpha,globalMask: this.globalMask,extraInfo: this.extras,numLayers: this.numLayers,layers: []};
            _ref = this.layers;
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                layer = _ref[_i];
                data.layers.push(layer.toJSON());
            }
            return data;
        };
        return PSDLayerMask;
    })();
    PSDBlackWhite = (function() {
        function PSDBlackWhite(layer, length) {
            this.layer = layer;
            this.length = length;
            this.file = this.layer.file;
        }
        PSDBlackWhite.prototype.parse = function() {
            var version;
            version = this.file.readInt();
            assert(version === 16);
            return (new PSDDescriptor(this.file)).parse();
        };
        return PSDBlackWhite;
    })();
    PSDBrightnessContrast = (function() {
        function PSDBrightnessContrast(layer, length) {
            this.layer = layer;
            this.length = length;
            this.file = this.layer.file;
            this.data = {};
        }
        PSDBrightnessContrast.prototype.parse = function() {
            this.data.brightness = this.file.getShortInt();
            this.data.contrast = this.file.getShortInt();
            this.data.meanValue = this.file.getShortInt();
            this.data.labColor = this.file.getShortInt();
            return this.data;
        };
        return PSDBrightnessContrast;
    })();
    PSDColorBalance = (function() {
        function PSDColorBalance(layer, length) {
            this.layer = layer;
            this.length = length;
            this.file = this.layer.file;
            this.data = {cyanRed: [],magentaGreen: [],yellowBlue: []};
        }
        PSDColorBalance.prototype.parse = function() {
            var i, _i;
            for (i = _i = 0; _i < 3; i = ++_i) {
                this.data.cyanRed.push(this.file.getShortInt());
                this.data.magentaGreen.push(this.file.getShortInt());
                this.data.yellowBlue.push(this.file.getShortInt());
            }
            return this.data;
        };
        return PSDColorBalance;
    })();
    PSDCurves = (function() {
        function PSDCurves(layer, length) {
            this.layer = layer;
            this.length = length;
            this.file = this.layer.file;
            this.data = {curve: []};
        }
        PSDCurves.prototype.parse = function() {
            var count, curveCount, i, inputValue, j, outputValue, pointCount, start, tag, version, _i, _j, _k, _l, _m, _n, _ref, _ref1, _ref2;
            start = this.file.tell();
            this.file.seek(1);
            version = this.file.readShortInt();
            assert(version === 1 || version === 4);
            tag = this.file.readInt();
            this.data.curveCount = 0;
            for (i = _i = 0; _i < 32; i = ++_i) {
                if (tag & (1 << i)) {
                    this.data.curveCount++;
                }
            }
            for (i = _j = 0, _ref = this.data.curveCount; 0 <= _ref ? _j < _ref : _j > _ref; i = 0 <= _ref ? ++_j : --_j) {
                count = 0;
                for (j = _k = 0; _k < 32; j = ++_k) {
                    if (tag & (1 << j)) {
                        if (count === i) {
                            this.data.curve[i] = {channelIndex: j};
                            break;
                        }
                        count++;
                    }
                }
                this.data.curve[i].pointCount = this.file.getShortInt();
                assert(this.data.curve[i].pointCount >= 2);
                assert(this.data.curve[i].pointCount <= 19);
                for (j = _l = 0, _ref1 = this.data.curve[i].pointCount; 0 <= _ref1 ? _l < _ref1 : _l > _ref1; j = 0 <= _ref1 ? ++_l : --_l) {
                    this.data.curve[i].outputValue[j] = this.file.readShortInt();
                    this.data.curve[i].inputValue[j] = this.file.readShortInt();
                    assert(this.data.curve[i].outputValue[j] >= 0);
                    assert(this.data.curve[i].outputValue[j] <= 255);
                    assert(this.data.curve[i].inputValue[j] >= 0);
                    assert(this.data.curve[i].inputValue[j] <= 255);
                }
            }
            if (this.file.tell() - start < this.length - 4) {
                tag = this.file.readString(4);
                assert.equal(tag, 'Crv ');
                version = this.file.readShortInt();
                assert(version === 4);
                curveCount = this.file.readInt();
                assert.equal(curveCount, this.data.curveCount);
                for (i = _m = 0, _ref2 = this.data.curveCount; 0 <= _ref2 ? _m < _ref2 : _m > _ref2; i = 0 <= _ref2 ? ++_m : --_m) {
                    this.data.curve[i].channelIndex = this.file.readShortInt();
                    pointCount = this.file.readShortInt();
                    assert(pointCount === this.data.curve[i].pointCount);
                    for (j = _n = 0; 0 <= pointCount ? _n < pointCount : _n > pointCount; j = 0 <= pointCount ? ++_n : --_n) {
                        outputValue = this.file.getShortInt();
                        inputValue = this.file.getShortInt();
                        assert.equal(outputValue, this.data.curve[i].outputValue[j]);
                        assert.equal(inputValue, this.data.curve[i].inputValue[j]);
                    }
                }
            }
            return this.data;
        };
        return PSDCurves;
    })();
    PSDExposure = (function() {
        function PSDExposure(layer, length) {
            this.layer = layer;
            this.length = length;
            this.file = this.layer.file;
        }
        PSDExposure.prototype.parse = function() {
            var version;
            version = this.file.parseInt();
            assert(version === 1);
            return {exposure: this.file.parseInt(),offset: this.file.parseInt(),gamma: this.file.parseInt()};
        };
        return PSDExposure;
    })();
    PSDGradient = (function() {
        function PSDGradient(layer, length) {
            this.layer = layer;
            this.length = length;
            this.file = this.layer.file;
        }
        PSDGradient.prototype.parse = function() {
            var version;
            version = this.file.readInt();
            assert(version === 16);
            return (new PSDDescriptor(this.file)).parse();
        };
        return PSDGradient;
    })();
    PSDHueSaturation = (function() {
        function PSDHueSaturation(layer, length) {
            this.layer = layer;
            this.length = length;
            this.file = this.layer.file;
        }
        PSDHueSaturation.prototype.parse = function() {
            var i, j, version, _i, _j, _k;
            version = this.file.getShortInt();
            assert(version === 2);
            this.data.colorization = this.file.readBoolean();
            this.file.seek(1);
            this.data.hue = this.file.getShortInt();
            this.data.saturation = this.file.getShortInt();
            this.data.lightness = this.file.getShortInt();
            this.data.masterHue = this.file.getShortInt();
            this.data.masterSaturation = this.file.getShortInt();
            this.data.masterLightness = this.file.getShortInt();
            this.data.rangeValues = [];
            this.data.settingValues = [];
            for (i = _i = 0; _i < 6; i = ++_i) {
                this.data.rangeValues[i] = [];
                this.data.settingValues[i] = [];
                for (j = _j = 0; _j < 4; j = ++_j) {
                    this.data.rangeValues[i][j] = this.file.getShortInt();
                }
                for (j = _k = 0; _k < 3; j = ++_k) {
                    this.data.settingValues[i][j] = this.file.getShortInt();
                }
            }
            return this.data;
        };
        return PSDHueSaturation;
    })();
    PSDInvert = (function() {
        function PSDInvert(layer, length) {
            this.layer = layer;
            this.length = length;
            this.file = this.layer.file;
        }
        PSDInvert.prototype.parse = function() {
            return true;
        };
        return PSDInvert;
    })();
    PSDLayerEffect = (function() {
        function PSDLayerEffect(file) {
            this.file = file;
        }
        PSDLayerEffect.prototype.parse = function() {
            var _ref;
            return _ref = this.file.readf(">i"), this.version = _ref[0], _ref;
        };
        PSDLayerEffect.prototype.getSpaceColor = function() {
            this.file.read(2);
            return this.file.readf(">HHHH");
        };
        return PSDLayerEffect;
    })();
    PSDLayerEffectCommonStateInfo = (function(_super) {
        __extends(PSDLayerEffectCommonStateInfo, _super);
        function PSDLayerEffectCommonStateInfo() {
            return PSDLayerEffectCommonStateInfo.__super__.constructor.apply(this, arguments);
        }
        PSDLayerEffectCommonStateInfo.prototype.parse = function() {
            PSDLayerEffectCommonStateInfo.__super__.parse.call(this);
            this.visible = this.file.readBoolean();
            this.file.read(2);
            return {visible: this.visible};
        };
        return PSDLayerEffectCommonStateInfo;
    })(PSDLayerEffect);
    PSDDropDownLayerEffect = (function(_super) {
        __extends(PSDDropDownLayerEffect, _super);
        function PSDDropDownLayerEffect(file, inner) {
            this.inner = inner != null ? inner : false;
            PSDDropDownLayerEffect.__super__.constructor.call(this, file);
            this.blendMode = "mul";
            this.color = this.nativeColor = [0, 0, 0, 0];
            this.opacity = 191;
            this.angle = 120;
            this.useGlobalLight = true;
            this.distance = 5;
            this.spread = 0;
            this.size = 5;
            this.antiAliased = false;
            this.knocksOut = false;
        }
        PSDDropDownLayerEffect.prototype.parse = function() {
            var data, key, val, _ref, _ref1;
            PSDDropDownLayerEffect.__super__.parse.call(this);
            _ref = this.file.readf(">hiii"), this.blur = _ref[0], this.intensity = _ref[1], this.angle = _ref[2], this.distance = _ref[3];
            this.file.read(2);
            this.color = this.getSpaceColor();
            _ref1 = this.file.readf(">4s4s"), this.signature = _ref1[0], this.blendMode = _ref1[1];
            this.enabled = this.file.readBoolean();
            this.useAngleInAllFX = this.file.readBoolean();
            this.opacity = this.file.read(1)[0];
            if (this.version === 2) {
                this.nativeColor = this.getSpaceColor();
            }
            data = {};
            for (key in this) {
                if (!__hasProp.call(this, key))
                    continue;
                val = this[key];
                if (key === "file") {
                    continue;
                }
                data[key] = val;
            }
            return data;
        };
        return PSDDropDownLayerEffect;
    })(PSDLayerEffect);
    PSDLevels = (function() {
        function PSDLevels(layer, length) {
            this.layer = layer;
            this.length = length;
            this.file = this.layer.file;
            this.data = {records: []};
        }
        PSDLevels.prototype.parse = function() {
            var start, tag, version;
            start = this.file.tell();
            version = this.file.readShortInt();
            assert(version === 1);
            this.parseLevelRecords();
            if (this.file.tell() - start < this.length - 4) {
                tag = this.file.readf(">4s");
                assert.equal(tag, "Lvls");
                version = this.file.readShortInt();
                assert.equal(version, 3);
                this.data.levelCount = this.file.readShortInt() - 29;
                assert(levelCount >= 0);
                this.parseLevelRecords(levelCount);
                return this.data;
            }
        };
        PSDLevels.prototype.parseLevelRecords = function(count) {
            var i, record, _i, _ref, _results;
            if (count == null) {
                count = 29;
            }
            _results = [];
            for (i = _i = 0; 0 <= count ? _i < count : _i > count; i = 0 <= count ? ++_i : --_i) {
                record = {};
                _ref = this.file.readf(">hhhhh"), record.inputFloor = _ref[0], record.inputCeiling = _ref[1], record.outputFloor = _ref[2], record.outputCeiling = _ref[3], record.gamma = _ref[4];
                record.gamma /= 100;
                if (i < 27) {
                    assert(record.inputFloor >= 0 && record.inputFloor <= 255);
                    assert(record.inputCeiling >= 2 && record.inputCeiling <= 255);
                    assert(record.outputFloor >= 0 && record.outputFloor <= 255);
                    assert(record.outputCeiling >= 0 && record.outputCeiling <= 255);
                    assert(record.gamma >= 0.1 && record.gamma <= 9.99);
                }
                _results.push(this.data.records.push(record));
            }
            return _results;
        };
        return PSDLevels;
    })();
    PSDPattern = (function() {
        function PSDPattern(layer, length) {
            this.layer = layer;
            this.length = length;
            this.file = this.layer.file;
        }
        PSDPattern.prototype.parse = function() {
            var version;
            version = this.file.parseInt();
            assert(version === 16);
            return (new PSDDescriptor(this.file)).parse();
        };
        return PSDPattern;
    })();
    PSDPhotoFilter = (function() {
        function PSDPhotoFilter(layer, length) {
            this.layer = layer;
            this.length = length;
            this.file = this.layer.file;
        }
        PSDPhotoFilter.prototype.parse = function() {
            var data, version;
            version = this.file.parseInt();
            assert(version === 3);
            data = {};
            data.color = {x: this.file.readInt(),y: this.file.readInt(),z: this.file.readInt()};
            data.density = this.file.readInt();
            data.preserveLuminosity = this.file.readBoolean();
            return data;
        };
        return PSDPhotoFilter;
    })();
    PSDPosterize = (function() {
        function PSDPosterize(layer, length) {
            this.layer = layer;
            this.length = length;
            this.file = this.layer.file;
            this.data = {};
        }
        PSDPosterize.prototype.parse = function() {
            this.data.levels = this.file.readShortInt();
            assert(this.data.levels >= 2 && this.data.levels <= 255);
            this.file.seek(2);
            return this.data;
        };
        return PSDPosterize;
    })();
    PSDSelectiveColor = (function() {
        function PSDSelectiveColor(layer, length) {
            this.layer = layer;
            this.length = length;
            this.file = this.layer.file;
            this.data = {cyanCorrection: [],magentaCorrection: [],yellowCorrection: [],blackCorrection: []};
        }
        PSDSelectiveColor.prototype.parse = function() {
            var i, version, _i;
            version = this.file.getShortInt();
            assert(version === 1);
            this.data.correctionMethod = this.file.getShortInt();
            for (i = _i = 0; _i < 10; i = ++_i) {
                this.data.cyanCorrection.push(this.file.getShortInt());
                this.data.magentaCorrection.push(this.file.getShortInt());
                this.data.yellowCorrection.push(this.file.getShortInt());
                this.data.blackCorrection.push(this.file.getShortInt());
            }
            return this.data;
        };
        return PSDSelectiveColor;
    })();
    PSDSolidColor = (function() {
        function PSDSolidColor(layer, length) {
            this.layer = layer;
            this.length = length;
            this.file = this.layer.file;
        }
        PSDSolidColor.prototype.parse = function() {
            var version;
            version = this.file.readInt();
            assert(version === 16);
            return (new PSDDescriptor(this.file)).parse();
        };
        return PSDSolidColor;
    })();
    PSDThreshold = (function() {
        function PSDThreshold(layer, length) {
            this.layer = layer;
            this.length = length;
            this.file = this.layer.file;
            this.data = {};
        }
        PSDThreshold.prototype.parse = function() {
            this.data.level = this.file.readShortInt();
            assert(this.data.level >= 1 && this.data.level <= 255);
            this.file.seek(2);
            return this.data;
        };
        return PSDThreshold;
    })();
    PSDTypeTool = (function() {
        function PSDTypeTool(layer, length) {
            this.layer = layer;
            this.length = length;
            this.file = this.layer.file;
            this.data = {};
        }
        PSDTypeTool.prototype.parse = function(legacy) {
            var char, descriptorVersion, engineData, textVersion, version, warpVersion, _i, _len, _ref, _ref1, _ref2;
            if (legacy == null) {
                legacy = false;
            }
            version = this.file.readShortInt();
            assert(version === 1);
            this.data.transformInfo = {};
            _ref = this.file.readf(">6d"), this.data.transformInfo.xx = _ref[0], this.data.transformInfo.xy = _ref[1], this.data.transformInfo.yx = _ref[2], this.data.transformInfo.yy = _ref[3], this.data.transformInfo.tx = _ref[4], this.data.transformInfo.ty = _ref[5];
            if (legacy) {
                return this.parseLegacy();
            }
            textVersion = this.file.readShortInt();
            assert(textVersion === 50);
            descriptorVersion = this.file.readInt();
            assert(descriptorVersion === 16);
            this.data.text = (new PSDDescriptor(this.file)).parse();
            engineData = "";
            _ref1 = this.data.text.EngineData;
            for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
                char = _ref1[_i];
                engineData += String.fromCharCode(char);
            }
            this.data.text.EngineData = engineData.replace(/\u0000/g, "");
            warpVersion = this.file.readShortInt();
            assert(warpVersion === 1);
            descriptorVersion = this.file.readInt();
            assert(descriptorVersion === 16);
            this.data.warp = (new PSDDescriptor(this.file)).parse();
            _ref2 = this.file.readf(">4d"), this.data.left = _ref2[0], this.data.top = _ref2[1], this.data.right = _ref2[2], this.data.bottom = _ref2[3];
            return this.data;
        };
        PSDTypeTool.prototype.parseLegacy = function() {
            var i, j, version, _i, _j, _k, _l, _ref, _ref1, _ref2, _ref3;
            version = this.file.readShortInt();
            assert(version === 6);
            this.data.facesCount = this.file.readShortInt();
            this.data.face = [];
            for (i = _i = 0, _ref = this.data.facesCount; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
                this.data.face[i] = {};
                this.data.face[i].mark = this.file.readShortInt();
                this.data.face[i].fontType = this.file.readInt();
                this.data.face[i].fontName = this.file.readLengthWithString();
                this.data.face[i].fontFamilyName = this.file.readLengthWithString();
                this.data.face[i].fontStyleName = this.file.readLengthWithString();
                this.data.face[i].script = this.file.readShortInt();
                this.data.face[i].numberAxesVector = this.file.readInt();
                this.data.face[i].vector = [];
                for (j = _j = 0, _ref1 = this.data.face[i].numberAxesVector; 0 <= _ref1 ? _j < _ref1 : _j > _ref1; j = 0 <= _ref1 ? ++_j : --_j) {
                    this.data.face[i].vector[j] = this.file.readInt();
                }
            }
            this.data.stylesCount = this.file.readShortInt();
            this.data.style = [];
            for (i = _k = 0, _ref2 = this.data.stylesCount; 0 <= _ref2 ? _k < _ref2 : _k > _ref2; i = 0 <= _ref2 ? ++_k : --_k) {
                this.data.style[i] = {};
                this.data.style[i].mark = this.file.readShortInt();
                this.data.style[i].faceMark = this.file.readShortInt();
                this.data.style[i].size = this.file.readInt();
                this.data.style[i].tracking = this.file.readInt();
                this.data.style[i].kerning = this.file.readInt();
                this.data.style[i].leading = this.file.readInt();
                this.data.style[i].baseShift = this.file.readInt();
                this.data.style[i].autoKern = this.file.readBoolean();
                this.file.read(1);
                this.data.style[i].rotate = this.file.readBoolean();
            }
            this.data.type = this.file.readShortInt();
            this.data.scalingFactor = this.file.readInt();
            this.data.sharacterCount = this.file.readInt();
            this.data.horzPlace = this.file.readInt();
            this.data.vertPlace = this.file.readInt();
            this.data.selectStart = this.file.readInt();
            this.data.selectEnd = this.file.readInt();
            this.data.linesCount = this.file.readShortInt();
            this.data.line = [];
            for (i = _l = 0, _ref3 = this.data.linesCount; 0 <= _ref3 ? _l < _ref3 : _l > _ref3; i = 0 <= _ref3 ? ++_l : --_l) {
                this.data.line[i].charCount = this.file.readInt();
                this.data.line[i].orientation = this.file.readShortInt();
                this.data.line[i].alignment = this.file.readShortInt();
                this.data.line[i].actualChar = this.file.readShortInt();
                this.data.line[i].style = this.file.readShortInt();
            }
            this.data.color = this.file.readSpaceColor();
            this.data.antialias = this.file.readBoolean();
            return this.data;
        };
        return PSDTypeTool;
    })();
    PSDVibrance = (function() {
        function PSDVibrance(layer, length) {
            this.layer = layer;
            this.length = length;
            this.file = this.layer.file;
        }
        PSDVibrance.prototype.parse = function() {
            var version;
            version = this.file.readInt();
            assert(version === 16);
            return (new PSDDescriptor(this.file)).parse();
        };
        return PSDVibrance;
    })();
    PSDResource = (function() {
        var RESOURCE_DESCRIPTIONS;
        RESOURCE_DESCRIPTIONS = {1000: {name: 'PS2.0 mode data',parse: function() {
                    var _ref;
                    return _ref = this.file.readf(">5H"), this.channels = _ref[0], this.rows = _ref[1], this.cols = _ref[2], this.depth = _ref[3], this.mode = _ref[4], _ref;
                }},1001: {name: 'Macintosh print record'},1003: {name: 'PS2.0 indexed color table'},1005: {name: 'ResolutionInfo'},1006: {name: 'Names of the alpha channels'},1007: {name: 'DisplayInfo'},1008: {name: 'Caption',parse: function() {
                    return this.caption = this.file.readLengthWithString();
                }},1009: {name: 'Border information',parse: function() {
                    var units, _ref;
                    _ref = this.file.readf(">fH"), this.width = _ref[0], units = _ref[1];
                    return this.units = (function() {
                        switch (units) {
                            case 1:
                                return "inches";
                            case 2:
                                return "cm";
                            case 3:
                                return "points";
                            case 4:
                                return "picas";
                            case 5:
                                return "columns";
                        }
                    })();
                }},1010: {name: 'Background color'},1011: {name: 'Print flags',parse: function() {
                    var start, _ref;
                    start = this.file.tell();
                    _ref = this.file.readf(">9B"), this.labels = _ref[0], this.cropMarks = _ref[1], this.colorBars = _ref[2], this.registrationMarks = _ref[3], this.negative = _ref[4], this.flip = _ref[5], this.interpolate = _ref[6], this.caption = _ref[7];
                    return this.file.seek(start + this.size, false);
                }},1012: {name: 'Grayscale/multichannel halftoning info'},1013: {name: 'Color halftoning info'},1014: {name: 'Duotone halftoning info'},1015: {name: 'Grayscale/multichannel transfer function'},1016: {name: 'Color transfer functions'},1017: {name: 'Duotone transfer functions'},1018: {name: 'Duotone image info'},1019: {name: 'B&W values for the dot range',parse: function() {
                    var _ref;
                    return _ref = this.file.readf(">H"), this.bwvalues = _ref[0], _ref;
                }},1021: {name: 'EPS options'},1022: {name: 'Quick Mask info',parse: function() {
                    var _ref;
                    return _ref = this.file.readf(">HB"), this.quickMaskChannelID = _ref[0], this.wasMaskEmpty = _ref[1], _ref;
                }},1024: {name: 'Layer state info',parse: function() {
                    var _ref;
                    return _ref = this.file.readf(">H"), this.targetLayer = _ref[0], _ref;
                }},1025: {name: 'Working path'},1026: {name: 'Layers group info',parse: function() {
                    var info, start, _results;
                    start = this.file.tell();
                    this.layerGroupInfo = [];
                    _results = [];
                    while (this.file.tell() < start + this.size) {
                        info = this.file.readf(">H")[0];
                        _results.push(this.layerGroupInfo.push(info));
                    }
                    return _results;
                }},1028: {name: 'IPTC-NAA record (File Info)'},1029: {name: 'Image mode for raw format files'},1030: {name: 'JPEG quality'},1032: {name: 'Grid and guides info'},1033: {name: 'Thumbnail resource'},1034: {name: 'Copyright flag',parse: function() {
                    var _ref;
                    return _ref = this.file.readf(">" + this.size + "B"), this.copyrighted = _ref[0], _ref;
                }},1035: {name: 'URL',parse: function() {
                    var _ref;
                    return _ref = this.file.readf(">" + this.size + "s"), this.url = _ref[0], _ref;
                }},1036: {name: 'Thumbnail resource'},1037: {name: 'Global Angle'},1038: {name: 'Color samplers resource'},1039: {name: 'ICC Profile'},1040: {name: 'Watermark',parse: function() {
                    var _ref;
                    return _ref = this.file.readf(">B"), this.watermarked = _ref[0], _ref;
                }},1041: {name: 'ICC Untagged'},1042: {name: 'Effects visible',parse: function() {
                    var _ref;
                    return _ref = this.file.readf(">B"), this.showEffects = _ref[0], _ref;
                }},1043: {name: 'Spot Halftone',parse: function() {
                    [this.halftoneVersion, length](this.file.readf(">LL"));
                    return this.halftoneData = this.file.read(length);
                }},1044: {name: 'Document specific IDs seed number',parse: function() {
                    var _ref;
                    return _ref = this.file.readf(">L"), this.docIdSeedNumber = _ref[0], _ref;
                }},1045: {name: 'Unicode Alpha Names'},1046: {name: 'Indexed Color Table Count',parse: function() {
                    var _ref;
                    return _ref = this.file.readf(">H"), this.indexedColorCount = _ref[0], _ref;
                }},1047: {name: 'Transparent Index',parse: function() {
                    var _ref;
                    return _ref = this.file.readf(">H"), this.transparencyIndex = _ref[0], _ref;
                }},1049: {name: 'Global Altitude',parse: function() {
                    var _ref;
                    return _ref = this.file.readf(">L"), this.globalAltitude = _ref[0], _ref;
                }},1050: {name: 'Slices'},1051: {name: 'Workflow URL',parse: function() {
                    return this.workflowName = this.file.readLengthWithString();
                }},1052: {name: 'Jump To XPEP',parse: function() {
                    var block, count, i, _i, _ref, _results;
                    _ref = this.file.readf(">HHL"), this.majorVersion = _ref[0], this.minorVersion = _ref[1], count = _ref[2];
                    this.xpepBlocks = [];
                    _results = [];
                    for (i = _i = 0; 0 <= count ? _i < count : _i > count; i = 0 <= count ? ++_i : --_i) {
                        block = {size: this.file.readf(">L"),key: this.file.readf(">4s")};
                        if (block.key === "jtDd") {
                            block.dirty = this.file.readBoolean();
                        } else {
                            block.modDate = this.file.readf(">L");
                        }
                        _results.push(this.xpepBlocks.push(block));
                    }
                    return _results;
                }},1053: {name: 'Alpha Identifiers'},1054: {name: 'URL List'},1057: {name: 'Version Info'},1058: {name: 'EXIF data 1'},1059: {name: 'EXIF data 3'},1060: {name: 'XMP metadata'},1061: {name: 'Caption digest'},1062: {name: 'Print scale'},1064: {name: 'Pixel Aspect Ratio'},1065: {name: 'Layer Comps'},1066: {name: 'Alternate Duotone Colors'},1067: {name: 'Alternate Spot Colors'},1069: {name: 'Layer Selection ID(s)'},1070: {name: 'HDR Toning information'},1071: {name: "Print info"},1072: {name: "Layer Groups Enabled"},1073: {name: "Color samplers resource"},1074: {name: "Measurement Scale"},1075: {name: "Timeline Information"},1076: {name: "Sheet Disclosure"},1077: {name: "DisplayInfo"},1078: {name: "Onion Skins"},1080: {name: "Count Information"},1082: {name: "Print Information"},1083: {name: "Print Style"},1084: {name: "Macintosh NSPrintInfo"},1085: {name: "Windows DEVMODE"},2999: {name: 'Name of clipping path'},7000: {name: "Image Ready variables"},7001: {name: "Image Ready data sets"},8000: {name: "Lightroom workflow",parse: PSDResource.isLightroom = true},10000: {name: 'Print flags info',parse: function() {
                    var padding, _ref;
                    return _ref = this.file.readf(">HBBLH"), this.version = _ref[0], this.centerCropMarks = _ref[1], padding = _ref[2], this.bleedWidth = _ref[3], this.bleedWidthScale = _ref[4], _ref;
                }}};
        function PSDResource(file) {
            this.file = file;
        }
        PSDResource.prototype.parse = function() {
            var n, resource, _ref, _ref1, _ref2;
            this.at = this.file.tell();
            _ref = this.file.readf(">4s H B"), this.type = _ref[0], this.id = _ref[1], this.namelen = _ref[2];
            Log.debug("Resource #" + this.id + ": type=" + this.type);
            n = Util.pad2(this.namelen + 1) - 1;
            this.name = this.file.readf(">" + n + "s")[0];
            this.name = this.name.substr(0, this.name.length - 1);
            this.shortName = this.name.substr(0, 20);
            this.size = this.file.readInt();
            this.size = Util.pad2(this.size);
            if ((2000 <= (_ref1 = this.id) && _ref1 <= 2998)) {
                this.rdesc = "[Path Information]";
                return this.file.seek(this.size);
            } else if (this.id === 2999) {
                return assert(0);
            } else if ((4000 <= (_ref2 = this.id) && _ref2 < 5000)) {
                this.rdesc = "[Plug-in Resource]";
                return this.file.seek(this.size);
            } else if (RESOURCE_DESCRIPTIONS[this.id] != null) {
                resource = RESOURCE_DESCRIPTIONS[this.id];
                this.rdesc = "[" + resource.name + "]";
                if (resource.parse != null) {
                    return resource.parse.call(this);
                } else {
                    return this.file.seek(this.size);
                }
            } else {
                return this.file.seek(this.size);
            }
        };
        PSDResource.prototype.toJSON = function() {
            var data, section, sections, _i, _len;
            sections = ['type', 'id', 'name', 'rdesc'];
            data = {};
            for (_i = 0, _len = sections.length; _i < _len; _i++) {
                section = sections[_i];
                data[section] = this[section];
            }
            return data;
        };
        return PSDResource;
    })();
    Util = (function() {
        function Util() {
        }
        Util.pad2 = function(i) {
            return Math.floor((i + 1) / 2) * 2;
        };
        Util.pad4 = function(i) {
            return i - (i % 4) + 3;
        };
        Util.toUInt16 = function(b1, b2) {
            return (b1 << 8) | b2;
        };
        Util.toInt16 = function(b1, b2) {
            var val;
            val = this.toUInt16(b1, b2);
            if (val >= 0x8000) {
                return val - 0x10000;
            } else {
                return val;
            }
        };
        Util.round = function(num, sigFig) {
            var mult;
            if (sigFig == null) {
                sigFig = 2;
            }
            if (sigFig === 0) {
                return Math.round(num);
            }
            mult = Math.pow(10, sigFig);
            return Math.round(num * mult) / mult;
        };
        Util.clamp = function(num, min, max) {
            var i, val, _i, _len;
            if (min == null) {
                min = Number.MIN_VALUE;
            }
            if (max == null) {
                max = Number.MAX_VALUE;
            }
            if (typeof num === "object" && (num.length != null)) {
                for (i = _i = 0, _len = num.length; _i < _len; i = ++_i) {
                    val = num[i];
                    num[i] = Math.max(Math.min(val, max), min);
                }
            } else if (typeof num === "object") {
                for (i in num) {
                    if (!__hasProp.call(num, i))
                        continue;
                    val = num[i];
                    num[i] = Math.max(Math.min(val, max), min);
                }
            } else {
                num = Math.max(Math.min(num, max), min);
            }
            return num;
        };
        Util.decodeMacroman = (function() {
            var high_chars_unicode;
            high_chars_unicode = '\u00c4\u00c5\u00c7\u00c9\u00d1\u00d6\u00dc\u00e1\n\u00e0\u00e2\u00e4\u00e3\u00e5\u00e7\u00e9\u00e8\n\u00ea\u00eb\u00ed\u00ec\u00ee\u00ef\u00f1\u00f3\n\u00f2\u00f4\u00f6\u00f5\u00fa\u00f9\u00fb\u00fc\n\u2020\u00b0\u00a2\u00a3\u00a7\u2022\u00b6\u00df\n\u00ae\u00a9\u2122\u00b4\u00a8\u2260\u00c6\u00d8\n\u221e\u00b1\u2264\u2265\u00a5\u00b5\u2202\u2211\n\u220f\u03c0\u222b\u00aa\u00ba\u03a9\u00e6\u00f8\n\u00bf\u00a1\u00ac\u221a\u0192\u2248\u2206\u00ab\n\u00bb\u2026\u00a0\u00c0\u00c3\u00d5\u0152\u0153\n\u2013\u2014\u201c\u201d\u2018\u2019\u00f7\u25ca\n\u00ff\u0178\u2044\u20ac\u2039\u203a\ufb01\ufb02\n\u2021\u00b7\u201a\u201e\u2030\u00c2\u00ca\u00c1\n\u00cb\u00c8\u00cd\u00ce\u00cf\u00cc\u00d3\u00d4\n\uf8ff\u00d2\u00da\u00db\u00d9\u0131\u02c6\u02dc\n\u00af\u02d8\u02d9\u02da\u00b8\u02dd\u02db\u02c7'.replace(/\n/g, '');
            return function(byte_array) {
                var byte, char_array, idx;
                char_array = (function() {
                    var _i, _len, _results;
                    _results = [];
                    for (idx = _i = 0, _len = byte_array.length; _i < _len; idx = ++_i) {
                        byte = byte_array[idx];
                        if (byte < 0x80) {
                            _results.push(String.fromCharCode(byte));
                        } else {
                            _results.push(high_chars_unicode.charAt(byte - 0x80));
                        }
                    }
                    return _results;
                })();
                return char_array.join('');
            };
        })();
        return Util;
    })();
    Log = (function() {
        function Log() {
        }
        Log.debug = Log.log = function() {
            return this.output("log", arguments);
        };
        Log.output = function(method, data) {
            if (typeof exports !== "undefined" && exports !== null) {
                if (PSD.DEBUG) {
                    return console[method].apply(null, data);
                }
            } else {
                if (PSD.DEBUG) {
                    return console[method]("[PSD]", data);
                }
            }
        };
        return Log;
    })();
}).call(this);
