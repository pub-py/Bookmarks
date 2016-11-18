/**
 * Created by barry on 16/11/14.
 */

if (typeof lib != "undefined")throw new Error('Global "lib" object already exists.');
var lib = {};
lib.runtimeDependencies_ = {};
lib.initCallbacks_ = [];
lib.rtdep = function (var_args) {
    var source;
    try {
        throw new Error;
    } catch (ex) {
        var stackArray = ex.stack.split("\n");
        if (stackArray.length >= 3)source = stackArray[2].replace(/^\s*at\s+/, ""); else source = stackArray[1].replace(/^\s*global code@/, "")
    }
    for (var i = 0; i < arguments.length; i++) {
        var path = arguments[i];
        if (path instanceof Array)lib.rtdep.apply(lib, path); else {
            var ary = this.runtimeDependencies_[path];
            if (!ary)ary = this.runtimeDependencies_[path] = [];
            ary.push(source)
        }
    }
};
lib.ensureRuntimeDependencies_ = function () {
    var passed = true;
    for (var path in lib.runtimeDependencies_) {
        var sourceList = lib.runtimeDependencies_[path];
        var names = path.split(".");
        var obj = window || self;
        for (var i = 0; i < names.length; i++) {
            if (!(names[i] in obj)) {
                console.warn('Missing "' + path + '" is needed by', sourceList);
                passed = false;
                break
            }
            obj = obj[names[i]]
        }
    }
    if (!passed)throw new Error("Failed runtime dependency check");
};
lib.registerInit = function (name, callback) {
    lib.initCallbacks_.push([name, callback]);
    return callback
};
lib.init = function (onInit, opt_logFunction) {
    var ary = lib.initCallbacks_;
    var initNext = function () {
        if (ary.length) {
            var rec = ary.shift();
            if (opt_logFunction)opt_logFunction("init: " + rec[0]);
            rec[1](lib.f.alarm(initNext))
        } else onInit()
    };
    if (typeof onInit != "function")throw new Error("Missing or invalid argument: onInit");
    lib.ensureRuntimeDependencies_();
    setTimeout(initNext, 0)
};
"use strict";
lib.colors = {};
lib.colors.re_ = {
    hex16: /#([a-f0-9])([a-f0-9])([a-f0-9])/i,
    hex24: /#([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})/i,
    rgb: new RegExp(("^/s*rgb/s*/(/s*(/d{1,3})/s*,/s*(/d{1,3})/s*," + "/s*(/d{1,3})/s*/)/s*$").replace(/\//g, "\\"), "i"),
    rgba: new RegExp(("^/s*rgba/s*" + "/(/s*(/d{1,3})/s*,/s*(/d{1,3})/s*,/s*(/d{1,3})/s*" + "(?:,/s*(/d+(?:/./d+)?)/s*)/)/s*$").replace(/\//g, "\\"), "i"),
    rgbx: new RegExp(("^/s*rgba?/s*" + "/(/s*(/d{1,3})/s*,/s*(/d{1,3})/s*,/s*(/d{1,3})/s*" + "(?:,/s*(/d+(?:/./d+)?)/s*)?/)/s*$").replace(/\//g, "\\"),
        "i"),
    x11rgb: /^\s*rgb:([a-f0-9]{1,4})\/([a-f0-9]{1,4})\/([a-f0-9]{1,4})\s*$/i,
    name: /[a-z][a-z0-9\s]+/
};
lib.colors.rgbToX11 = function (value) {
    function scale(v) {
        v = (Math.min(v, 255) * 257).toString(16);
        while (v.length < 4)v = "0" + v;
        return v
    }

    var ary = value.match(lib.colors.re_.rgbx);
    if (!ary)return null;
    return "rgb:" + scale(ary[1]) + "/" + scale(ary[2]) + "/" + scale(ary[3])
};
lib.colors.x11ToCSS = function (v) {
    function scale(v) {
        if (v.length == 1)return parseInt(v + v, 16);
        if (v.length == 2)return parseInt(v, 16);
        if (v.length == 3)v = v + v.substr(2);
        return Math.round(parseInt(v, 16) / 257)
    }

    var ary = v.match(lib.colors.re_.x11rgb);
    if (!ary)return lib.colors.nameToRGB(v);
    ary.splice(0, 1);
    return lib.colors.arrayToRGBA(ary.map(scale))
};
lib.colors.hexToRGB = function (arg) {
    var hex16 = lib.colors.re_.hex16;
    var hex24 = lib.colors.re_.hex24;

    function convert(hex) {
        if (hex.length == 4)hex = hex.replace(hex16, function (h, r, g, b) {
            return "#" + r + r + g + g + b + b
        });
        var ary = hex.match(hex24);
        if (!ary)return null;
        return "rgb(" + parseInt(ary[1], 16) + ", " + parseInt(ary[2], 16) + ", " + parseInt(ary[3], 16) + ")"
    }

    if (arg instanceof Array)for (var i = 0; i < arg.length; i++)arg[i] = convert(arg[i]); else arg = convert(arg);
    return arg
};
lib.colors.rgbToHex = function (arg) {
    function convert(rgb) {
        var ary = lib.colors.crackRGB(rgb);
        return "#" + lib.f.zpad((parseInt(ary[0]) << 16 | parseInt(ary[1]) << 8 | parseInt(ary[2]) << 0).toString(16), 6)
    }

    if (arg instanceof Array)for (var i = 0; i < arg.length; i++)arg[i] = convert(arg[i]); else arg = convert(arg);
    return arg
};
lib.colors.normalizeCSS = function (def) {
    if (def.substr(0, 1) == "#")return lib.colors.hexToRGB(def);
    if (lib.colors.re_.rgbx.test(def))return def;
    return lib.colors.nameToRGB(def)
};
lib.colors.arrayToRGBA = function (ary) {
    var alpha = ary.length > 3 ? ary[3] : 1;
    return "rgba(" + ary[0] + ", " + ary[1] + ", " + ary[2] + ", " + alpha + ")"
};
lib.colors.setAlpha = function (rgb, alpha) {
    var ary = lib.colors.crackRGB(rgb);
    ary[3] = alpha;
    return lib.colors.arrayToRGBA(ary)
};
lib.colors.mix = function (base, tint, percent) {
    var ary1 = lib.colors.crackRGB(base);
    var ary2 = lib.colors.crackRGB(tint);
    for (var i = 0; i < 4; ++i) {
        var diff = ary2[i] - ary1[i];
        ary1[i] = Math.round(parseInt(ary1[i]) + diff * percent)
    }
    return lib.colors.arrayToRGBA(ary1)
};
lib.colors.crackRGB = function (color) {
    if (color.substr(0, 4) == "rgba") {
        var ary = color.match(lib.colors.re_.rgba);
        if (ary) {
            ary.shift();
            return ary
        }
    } else {
        var ary = color.match(lib.colors.re_.rgb);
        if (ary) {
            ary.shift();
            ary.push(1);
            return ary
        }
    }
    console.error("Couldn't crack: " + color);
    return null
};
lib.colors.nameToRGB = function (name) {
    if (name in lib.colors.colorNames)return lib.colors.colorNames[name];
    name = name.toLowerCase();
    if (name in lib.colors.colorNames)return lib.colors.colorNames[name];
    name = name.replace(/\s+/g, "");
    if (name in lib.colors.colorNames)return lib.colors.colorNames[name];
    return null
};
lib.colors.stockColorPalette = lib.colors.hexToRGB(["#000000", "#CC0000", "#4E9A06", "#C4A000", "#3465A4", "#75507B", "#06989A", "#D3D7CF", "#555753", "#EF2929", "#00BA13", "#FCE94F", "#729FCF", "#F200CB", "#00B5BD", "#EEEEEC", "#000000", "#00005F", "#000087", "#0000AF", "#0000D7", "#0000FF", "#005F00", "#005F5F", "#005F87", "#005FAF", "#005FD7", "#005FFF", "#008700", "#00875F", "#008787", "#0087AF", "#0087D7", "#0087FF", "#00AF00", "#00AF5F", "#00AF87", "#00AFAF", "#00AFD7", "#00AFFF", "#00D700", "#00D75F", "#00D787", "#00D7AF", "#00D7D7", "#00D7FF",
    "#00FF00", "#00FF5F", "#00FF87", "#00FFAF", "#00FFD7", "#00FFFF", "#5F0000", "#5F005F", "#5F0087", "#5F00AF", "#5F00D7", "#5F00FF", "#5F5F00", "#5F5F5F", "#5F5F87", "#5F5FAF", "#5F5FD7", "#5F5FFF", "#5F8700", "#5F875F", "#5F8787", "#5F87AF", "#5F87D7", "#5F87FF", "#5FAF00", "#5FAF5F", "#5FAF87", "#5FAFAF", "#5FAFD7", "#5FAFFF", "#5FD700", "#5FD75F", "#5FD787", "#5FD7AF", "#5FD7D7", "#5FD7FF", "#5FFF00", "#5FFF5F", "#5FFF87", "#5FFFAF", "#5FFFD7", "#5FFFFF", "#870000", "#87005F", "#870087", "#8700AF", "#8700D7", "#8700FF", "#875F00", "#875F5F", "#875F87",
    "#875FAF", "#875FD7", "#875FFF", "#878700", "#87875F", "#878787", "#8787AF", "#8787D7", "#8787FF", "#87AF00", "#87AF5F", "#87AF87", "#87AFAF", "#87AFD7", "#87AFFF", "#87D700", "#87D75F", "#87D787", "#87D7AF", "#87D7D7", "#87D7FF", "#87FF00", "#87FF5F", "#87FF87", "#87FFAF", "#87FFD7", "#87FFFF", "#AF0000", "#AF005F", "#AF0087", "#AF00AF", "#AF00D7", "#AF00FF", "#AF5F00", "#AF5F5F", "#AF5F87", "#AF5FAF", "#AF5FD7", "#AF5FFF", "#AF8700", "#AF875F", "#AF8787", "#AF87AF", "#AF87D7", "#AF87FF", "#AFAF00", "#AFAF5F", "#AFAF87", "#AFAFAF", "#AFAFD7", "#AFAFFF",
    "#AFD700", "#AFD75F", "#AFD787", "#AFD7AF", "#AFD7D7", "#AFD7FF", "#AFFF00", "#AFFF5F", "#AFFF87", "#AFFFAF", "#AFFFD7", "#AFFFFF", "#D70000", "#D7005F", "#D70087", "#D700AF", "#D700D7", "#D700FF", "#D75F00", "#D75F5F", "#D75F87", "#D75FAF", "#D75FD7", "#D75FFF", "#D78700", "#D7875F", "#D78787", "#D787AF", "#D787D7", "#D787FF", "#D7AF00", "#D7AF5F", "#D7AF87", "#D7AFAF", "#D7AFD7", "#D7AFFF", "#D7D700", "#D7D75F", "#D7D787", "#D7D7AF", "#D7D7D7", "#D7D7FF", "#D7FF00", "#D7FF5F", "#D7FF87", "#D7FFAF", "#D7FFD7", "#D7FFFF", "#FF0000", "#FF005F", "#FF0087",
    "#FF00AF", "#FF00D7", "#FF00FF", "#FF5F00", "#FF5F5F", "#FF5F87", "#FF5FAF", "#FF5FD7", "#FF5FFF", "#FF8700", "#FF875F", "#FF8787", "#FF87AF", "#FF87D7", "#FF87FF", "#FFAF00", "#FFAF5F", "#FFAF87", "#FFAFAF", "#FFAFD7", "#FFAFFF", "#FFD700", "#FFD75F", "#FFD787", "#FFD7AF", "#FFD7D7", "#FFD7FF", "#FFFF00", "#FFFF5F", "#FFFF87", "#FFFFAF", "#FFFFD7", "#FFFFFF", "#080808", "#121212", "#1C1C1C", "#262626", "#303030", "#3A3A3A", "#444444", "#4E4E4E", "#585858", "#626262", "#6C6C6C", "#767676", "#808080", "#8A8A8A", "#949494", "#9E9E9E", "#A8A8A8", "#B2B2B2",
    "#BCBCBC", "#C6C6C6", "#D0D0D0", "#DADADA", "#E4E4E4", "#EEEEEE"]);
lib.colors.colorPalette = lib.colors.stockColorPalette;
lib.colors.colorNames = {
    "aliceblue": "rgb(240, 248, 255)",
    "antiquewhite": "rgb(250, 235, 215)",
    "antiquewhite1": "rgb(255, 239, 219)",
    "antiquewhite2": "rgb(238, 223, 204)",
    "antiquewhite3": "rgb(205, 192, 176)",
    "antiquewhite4": "rgb(139, 131, 120)",
    "aquamarine": "rgb(127, 255, 212)",
    "aquamarine1": "rgb(127, 255, 212)",
    "aquamarine2": "rgb(118, 238, 198)",
    "aquamarine3": "rgb(102, 205, 170)",
    "aquamarine4": "rgb(69, 139, 116)",
    "azure": "rgb(240, 255, 255)",
    "azure1": "rgb(240, 255, 255)",
    "azure2": "rgb(224, 238, 238)",
    "azure3": "rgb(193, 205, 205)",
    "azure4": "rgb(131, 139, 139)",
    "beige": "rgb(245, 245, 220)",
    "bisque": "rgb(255, 228, 196)",
    "bisque1": "rgb(255, 228, 196)",
    "bisque2": "rgb(238, 213, 183)",
    "bisque3": "rgb(205, 183, 158)",
    "bisque4": "rgb(139, 125, 107)",
    "black": "rgb(0, 0, 0)",
    "blanchedalmond": "rgb(255, 235, 205)",
    "blue": "rgb(0, 0, 255)",
    "blue1": "rgb(0, 0, 255)",
    "blue2": "rgb(0, 0, 238)",
    "blue3": "rgb(0, 0, 205)",
    "blue4": "rgb(0, 0, 139)",
    "blueviolet": "rgb(138, 43, 226)",
    "brown": "rgb(165, 42, 42)",
    "brown1": "rgb(255, 64, 64)",
    "brown2": "rgb(238, 59, 59)",
    "brown3": "rgb(205, 51, 51)",
    "brown4": "rgb(139, 35, 35)",
    "burlywood": "rgb(222, 184, 135)",
    "burlywood1": "rgb(255, 211, 155)",
    "burlywood2": "rgb(238, 197, 145)",
    "burlywood3": "rgb(205, 170, 125)",
    "burlywood4": "rgb(139, 115, 85)",
    "cadetblue": "rgb(95, 158, 160)",
    "cadetblue1": "rgb(152, 245, 255)",
    "cadetblue2": "rgb(142, 229, 238)",
    "cadetblue3": "rgb(122, 197, 205)",
    "cadetblue4": "rgb(83, 134, 139)",
    "chartreuse": "rgb(127, 255, 0)",
    "chartreuse1": "rgb(127, 255, 0)",
    "chartreuse2": "rgb(118, 238, 0)",
    "chartreuse3": "rgb(102, 205, 0)",
    "chartreuse4": "rgb(69, 139, 0)",
    "chocolate": "rgb(210, 105, 30)",
    "chocolate1": "rgb(255, 127, 36)",
    "chocolate2": "rgb(238, 118, 33)",
    "chocolate3": "rgb(205, 102, 29)",
    "chocolate4": "rgb(139, 69, 19)",
    "coral": "rgb(255, 127, 80)",
    "coral1": "rgb(255, 114, 86)",
    "coral2": "rgb(238, 106, 80)",
    "coral3": "rgb(205, 91, 69)",
    "coral4": "rgb(139, 62, 47)",
    "cornflowerblue": "rgb(100, 149, 237)",
    "cornsilk": "rgb(255, 248, 220)",
    "cornsilk1": "rgb(255, 248, 220)",
    "cornsilk2": "rgb(238, 232, 205)",
    "cornsilk3": "rgb(205, 200, 177)",
    "cornsilk4": "rgb(139, 136, 120)",
    "cyan": "rgb(0, 255, 255)",
    "cyan1": "rgb(0, 255, 255)",
    "cyan2": "rgb(0, 238, 238)",
    "cyan3": "rgb(0, 205, 205)",
    "cyan4": "rgb(0, 139, 139)",
    "darkblue": "rgb(0, 0, 139)",
    "darkcyan": "rgb(0, 139, 139)",
    "darkgoldenrod": "rgb(184, 134, 11)",
    "darkgoldenrod1": "rgb(255, 185, 15)",
    "darkgoldenrod2": "rgb(238, 173, 14)",
    "darkgoldenrod3": "rgb(205, 149, 12)",
    "darkgoldenrod4": "rgb(139, 101, 8)",
    "darkgray": "rgb(169, 169, 169)",
    "darkgreen": "rgb(0, 100, 0)",
    "darkgrey": "rgb(169, 169, 169)",
    "darkkhaki": "rgb(189, 183, 107)",
    "darkmagenta": "rgb(139, 0, 139)",
    "darkolivegreen": "rgb(85, 107, 47)",
    "darkolivegreen1": "rgb(202, 255, 112)",
    "darkolivegreen2": "rgb(188, 238, 104)",
    "darkolivegreen3": "rgb(162, 205, 90)",
    "darkolivegreen4": "rgb(110, 139, 61)",
    "darkorange": "rgb(255, 140, 0)",
    "darkorange1": "rgb(255, 127, 0)",
    "darkorange2": "rgb(238, 118, 0)",
    "darkorange3": "rgb(205, 102, 0)",
    "darkorange4": "rgb(139, 69, 0)",
    "darkorchid": "rgb(153, 50, 204)",
    "darkorchid1": "rgb(191, 62, 255)",
    "darkorchid2": "rgb(178, 58, 238)",
    "darkorchid3": "rgb(154, 50, 205)",
    "darkorchid4": "rgb(104, 34, 139)",
    "darkred": "rgb(139, 0, 0)",
    "darksalmon": "rgb(233, 150, 122)",
    "darkseagreen": "rgb(143, 188, 143)",
    "darkseagreen1": "rgb(193, 255, 193)",
    "darkseagreen2": "rgb(180, 238, 180)",
    "darkseagreen3": "rgb(155, 205, 155)",
    "darkseagreen4": "rgb(105, 139, 105)",
    "darkslateblue": "rgb(72, 61, 139)",
    "darkslategray": "rgb(47, 79, 79)",
    "darkslategray1": "rgb(151, 255, 255)",
    "darkslategray2": "rgb(141, 238, 238)",
    "darkslategray3": "rgb(121, 205, 205)",
    "darkslategray4": "rgb(82, 139, 139)",
    "darkslategrey": "rgb(47, 79, 79)",
    "darkturquoise": "rgb(0, 206, 209)",
    "darkviolet": "rgb(148, 0, 211)",
    "debianred": "rgb(215, 7, 81)",
    "deeppink": "rgb(255, 20, 147)",
    "deeppink1": "rgb(255, 20, 147)",
    "deeppink2": "rgb(238, 18, 137)",
    "deeppink3": "rgb(205, 16, 118)",
    "deeppink4": "rgb(139, 10, 80)",
    "deepskyblue": "rgb(0, 191, 255)",
    "deepskyblue1": "rgb(0, 191, 255)",
    "deepskyblue2": "rgb(0, 178, 238)",
    "deepskyblue3": "rgb(0, 154, 205)",
    "deepskyblue4": "rgb(0, 104, 139)",
    "dimgray": "rgb(105, 105, 105)",
    "dimgrey": "rgb(105, 105, 105)",
    "dodgerblue": "rgb(30, 144, 255)",
    "dodgerblue1": "rgb(30, 144, 255)",
    "dodgerblue2": "rgb(28, 134, 238)",
    "dodgerblue3": "rgb(24, 116, 205)",
    "dodgerblue4": "rgb(16, 78, 139)",
    "firebrick": "rgb(178, 34, 34)",
    "firebrick1": "rgb(255, 48, 48)",
    "firebrick2": "rgb(238, 44, 44)",
    "firebrick3": "rgb(205, 38, 38)",
    "firebrick4": "rgb(139, 26, 26)",
    "floralwhite": "rgb(255, 250, 240)",
    "forestgreen": "rgb(34, 139, 34)",
    "gainsboro": "rgb(220, 220, 220)",
    "ghostwhite": "rgb(248, 248, 255)",
    "gold": "rgb(255, 215, 0)",
    "gold1": "rgb(255, 215, 0)",
    "gold2": "rgb(238, 201, 0)",
    "gold3": "rgb(205, 173, 0)",
    "gold4": "rgb(139, 117, 0)",
    "goldenrod": "rgb(218, 165, 32)",
    "goldenrod1": "rgb(255, 193, 37)",
    "goldenrod2": "rgb(238, 180, 34)",
    "goldenrod3": "rgb(205, 155, 29)",
    "goldenrod4": "rgb(139, 105, 20)",
    "gray": "rgb(190, 190, 190)",
    "gray0": "rgb(0, 0, 0)",
    "gray1": "rgb(3, 3, 3)",
    "gray10": "rgb(26, 26, 26)",
    "gray100": "rgb(255, 255, 255)",
    "gray11": "rgb(28, 28, 28)",
    "gray12": "rgb(31, 31, 31)",
    "gray13": "rgb(33, 33, 33)",
    "gray14": "rgb(36, 36, 36)",
    "gray15": "rgb(38, 38, 38)",
    "gray16": "rgb(41, 41, 41)",
    "gray17": "rgb(43, 43, 43)",
    "gray18": "rgb(46, 46, 46)",
    "gray19": "rgb(48, 48, 48)",
    "gray2": "rgb(5, 5, 5)",
    "gray20": "rgb(51, 51, 51)",
    "gray21": "rgb(54, 54, 54)",
    "gray22": "rgb(56, 56, 56)",
    "gray23": "rgb(59, 59, 59)",
    "gray24": "rgb(61, 61, 61)",
    "gray25": "rgb(64, 64, 64)",
    "gray26": "rgb(66, 66, 66)",
    "gray27": "rgb(69, 69, 69)",
    "gray28": "rgb(71, 71, 71)",
    "gray29": "rgb(74, 74, 74)",
    "gray3": "rgb(8, 8, 8)",
    "gray30": "rgb(77, 77, 77)",
    "gray31": "rgb(79, 79, 79)",
    "gray32": "rgb(82, 82, 82)",
    "gray33": "rgb(84, 84, 84)",
    "gray34": "rgb(87, 87, 87)",
    "gray35": "rgb(89, 89, 89)",
    "gray36": "rgb(92, 92, 92)",
    "gray37": "rgb(94, 94, 94)",
    "gray38": "rgb(97, 97, 97)",
    "gray39": "rgb(99, 99, 99)",
    "gray4": "rgb(10, 10, 10)",
    "gray40": "rgb(102, 102, 102)",
    "gray41": "rgb(105, 105, 105)",
    "gray42": "rgb(107, 107, 107)",
    "gray43": "rgb(110, 110, 110)",
    "gray44": "rgb(112, 112, 112)",
    "gray45": "rgb(115, 115, 115)",
    "gray46": "rgb(117, 117, 117)",
    "gray47": "rgb(120, 120, 120)",
    "gray48": "rgb(122, 122, 122)",
    "gray49": "rgb(125, 125, 125)",
    "gray5": "rgb(13, 13, 13)",
    "gray50": "rgb(127, 127, 127)",
    "gray51": "rgb(130, 130, 130)",
    "gray52": "rgb(133, 133, 133)",
    "gray53": "rgb(135, 135, 135)",
    "gray54": "rgb(138, 138, 138)",
    "gray55": "rgb(140, 140, 140)",
    "gray56": "rgb(143, 143, 143)",
    "gray57": "rgb(145, 145, 145)",
    "gray58": "rgb(148, 148, 148)",
    "gray59": "rgb(150, 150, 150)",
    "gray6": "rgb(15, 15, 15)",
    "gray60": "rgb(153, 153, 153)",
    "gray61": "rgb(156, 156, 156)",
    "gray62": "rgb(158, 158, 158)",
    "gray63": "rgb(161, 161, 161)",
    "gray64": "rgb(163, 163, 163)",
    "gray65": "rgb(166, 166, 166)",
    "gray66": "rgb(168, 168, 168)",
    "gray67": "rgb(171, 171, 171)",
    "gray68": "rgb(173, 173, 173)",
    "gray69": "rgb(176, 176, 176)",
    "gray7": "rgb(18, 18, 18)",
    "gray70": "rgb(179, 179, 179)",
    "gray71": "rgb(181, 181, 181)",
    "gray72": "rgb(184, 184, 184)",
    "gray73": "rgb(186, 186, 186)",
    "gray74": "rgb(189, 189, 189)",
    "gray75": "rgb(191, 191, 191)",
    "gray76": "rgb(194, 194, 194)",
    "gray77": "rgb(196, 196, 196)",
    "gray78": "rgb(199, 199, 199)",
    "gray79": "rgb(201, 201, 201)",
    "gray8": "rgb(20, 20, 20)",
    "gray80": "rgb(204, 204, 204)",
    "gray81": "rgb(207, 207, 207)",
    "gray82": "rgb(209, 209, 209)",
    "gray83": "rgb(212, 212, 212)",
    "gray84": "rgb(214, 214, 214)",
    "gray85": "rgb(217, 217, 217)",
    "gray86": "rgb(219, 219, 219)",
    "gray87": "rgb(222, 222, 222)",
    "gray88": "rgb(224, 224, 224)",
    "gray89": "rgb(227, 227, 227)",
    "gray9": "rgb(23, 23, 23)",
    "gray90": "rgb(229, 229, 229)",
    "gray91": "rgb(232, 232, 232)",
    "gray92": "rgb(235, 235, 235)",
    "gray93": "rgb(237, 237, 237)",
    "gray94": "rgb(240, 240, 240)",
    "gray95": "rgb(242, 242, 242)",
    "gray96": "rgb(245, 245, 245)",
    "gray97": "rgb(247, 247, 247)",
    "gray98": "rgb(250, 250, 250)",
    "gray99": "rgb(252, 252, 252)",
    "green": "rgb(0, 255, 0)",
    "green1": "rgb(0, 255, 0)",
    "green2": "rgb(0, 238, 0)",
    "green3": "rgb(0, 205, 0)",
    "green4": "rgb(0, 139, 0)",
    "greenyellow": "rgb(173, 255, 47)",
    "grey": "rgb(190, 190, 190)",
    "grey0": "rgb(0, 0, 0)",
    "grey1": "rgb(3, 3, 3)",
    "grey10": "rgb(26, 26, 26)",
    "grey100": "rgb(255, 255, 255)",
    "grey11": "rgb(28, 28, 28)",
    "grey12": "rgb(31, 31, 31)",
    "grey13": "rgb(33, 33, 33)",
    "grey14": "rgb(36, 36, 36)",
    "grey15": "rgb(38, 38, 38)",
    "grey16": "rgb(41, 41, 41)",
    "grey17": "rgb(43, 43, 43)",
    "grey18": "rgb(46, 46, 46)",
    "grey19": "rgb(48, 48, 48)",
    "grey2": "rgb(5, 5, 5)",
    "grey20": "rgb(51, 51, 51)",
    "grey21": "rgb(54, 54, 54)",
    "grey22": "rgb(56, 56, 56)",
    "grey23": "rgb(59, 59, 59)",
    "grey24": "rgb(61, 61, 61)",
    "grey25": "rgb(64, 64, 64)",
    "grey26": "rgb(66, 66, 66)",
    "grey27": "rgb(69, 69, 69)",
    "grey28": "rgb(71, 71, 71)",
    "grey29": "rgb(74, 74, 74)",
    "grey3": "rgb(8, 8, 8)",
    "grey30": "rgb(77, 77, 77)",
    "grey31": "rgb(79, 79, 79)",
    "grey32": "rgb(82, 82, 82)",
    "grey33": "rgb(84, 84, 84)",
    "grey34": "rgb(87, 87, 87)",
    "grey35": "rgb(89, 89, 89)",
    "grey36": "rgb(92, 92, 92)",
    "grey37": "rgb(94, 94, 94)",
    "grey38": "rgb(97, 97, 97)",
    "grey39": "rgb(99, 99, 99)",
    "grey4": "rgb(10, 10, 10)",
    "grey40": "rgb(102, 102, 102)",
    "grey41": "rgb(105, 105, 105)",
    "grey42": "rgb(107, 107, 107)",
    "grey43": "rgb(110, 110, 110)",
    "grey44": "rgb(112, 112, 112)",
    "grey45": "rgb(115, 115, 115)",
    "grey46": "rgb(117, 117, 117)",
    "grey47": "rgb(120, 120, 120)",
    "grey48": "rgb(122, 122, 122)",
    "grey49": "rgb(125, 125, 125)",
    "grey5": "rgb(13, 13, 13)",
    "grey50": "rgb(127, 127, 127)",
    "grey51": "rgb(130, 130, 130)",
    "grey52": "rgb(133, 133, 133)",
    "grey53": "rgb(135, 135, 135)",
    "grey54": "rgb(138, 138, 138)",
    "grey55": "rgb(140, 140, 140)",
    "grey56": "rgb(143, 143, 143)",
    "grey57": "rgb(145, 145, 145)",
    "grey58": "rgb(148, 148, 148)",
    "grey59": "rgb(150, 150, 150)",
    "grey6": "rgb(15, 15, 15)",
    "grey60": "rgb(153, 153, 153)",
    "grey61": "rgb(156, 156, 156)",
    "grey62": "rgb(158, 158, 158)",
    "grey63": "rgb(161, 161, 161)",
    "grey64": "rgb(163, 163, 163)",
    "grey65": "rgb(166, 166, 166)",
    "grey66": "rgb(168, 168, 168)",
    "grey67": "rgb(171, 171, 171)",
    "grey68": "rgb(173, 173, 173)",
    "grey69": "rgb(176, 176, 176)",
    "grey7": "rgb(18, 18, 18)",
    "grey70": "rgb(179, 179, 179)",
    "grey71": "rgb(181, 181, 181)",
    "grey72": "rgb(184, 184, 184)",
    "grey73": "rgb(186, 186, 186)",
    "grey74": "rgb(189, 189, 189)",
    "grey75": "rgb(191, 191, 191)",
    "grey76": "rgb(194, 194, 194)",
    "grey77": "rgb(196, 196, 196)",
    "grey78": "rgb(199, 199, 199)",
    "grey79": "rgb(201, 201, 201)",
    "grey8": "rgb(20, 20, 20)",
    "grey80": "rgb(204, 204, 204)",
    "grey81": "rgb(207, 207, 207)",
    "grey82": "rgb(209, 209, 209)",
    "grey83": "rgb(212, 212, 212)",
    "grey84": "rgb(214, 214, 214)",
    "grey85": "rgb(217, 217, 217)",
    "grey86": "rgb(219, 219, 219)",
    "grey87": "rgb(222, 222, 222)",
    "grey88": "rgb(224, 224, 224)",
    "grey89": "rgb(227, 227, 227)",
    "grey9": "rgb(23, 23, 23)",
    "grey90": "rgb(229, 229, 229)",
    "grey91": "rgb(232, 232, 232)",
    "grey92": "rgb(235, 235, 235)",
    "grey93": "rgb(237, 237, 237)",
    "grey94": "rgb(240, 240, 240)",
    "grey95": "rgb(242, 242, 242)",
    "grey96": "rgb(245, 245, 245)",
    "grey97": "rgb(247, 247, 247)",
    "grey98": "rgb(250, 250, 250)",
    "grey99": "rgb(252, 252, 252)",
    "honeydew": "rgb(240, 255, 240)",
    "honeydew1": "rgb(240, 255, 240)",
    "honeydew2": "rgb(224, 238, 224)",
    "honeydew3": "rgb(193, 205, 193)",
    "honeydew4": "rgb(131, 139, 131)",
    "hotpink": "rgb(255, 105, 180)",
    "hotpink1": "rgb(255, 110, 180)",
    "hotpink2": "rgb(238, 106, 167)",
    "hotpink3": "rgb(205, 96, 144)",
    "hotpink4": "rgb(139, 58, 98)",
    "indianred": "rgb(205, 92, 92)",
    "indianred1": "rgb(255, 106, 106)",
    "indianred2": "rgb(238, 99, 99)",
    "indianred3": "rgb(205, 85, 85)",
    "indianred4": "rgb(139, 58, 58)",
    "ivory": "rgb(255, 255, 240)",
    "ivory1": "rgb(255, 255, 240)",
    "ivory2": "rgb(238, 238, 224)",
    "ivory3": "rgb(205, 205, 193)",
    "ivory4": "rgb(139, 139, 131)",
    "khaki": "rgb(240, 230, 140)",
    "khaki1": "rgb(255, 246, 143)",
    "khaki2": "rgb(238, 230, 133)",
    "khaki3": "rgb(205, 198, 115)",
    "khaki4": "rgb(139, 134, 78)",
    "lavender": "rgb(230, 230, 250)",
    "lavenderblush": "rgb(255, 240, 245)",
    "lavenderblush1": "rgb(255, 240, 245)",
    "lavenderblush2": "rgb(238, 224, 229)",
    "lavenderblush3": "rgb(205, 193, 197)",
    "lavenderblush4": "rgb(139, 131, 134)",
    "lawngreen": "rgb(124, 252, 0)",
    "lemonchiffon": "rgb(255, 250, 205)",
    "lemonchiffon1": "rgb(255, 250, 205)",
    "lemonchiffon2": "rgb(238, 233, 191)",
    "lemonchiffon3": "rgb(205, 201, 165)",
    "lemonchiffon4": "rgb(139, 137, 112)",
    "lightblue": "rgb(173, 216, 230)",
    "lightblue1": "rgb(191, 239, 255)",
    "lightblue2": "rgb(178, 223, 238)",
    "lightblue3": "rgb(154, 192, 205)",
    "lightblue4": "rgb(104, 131, 139)",
    "lightcoral": "rgb(240, 128, 128)",
    "lightcyan": "rgb(224, 255, 255)",
    "lightcyan1": "rgb(224, 255, 255)",
    "lightcyan2": "rgb(209, 238, 238)",
    "lightcyan3": "rgb(180, 205, 205)",
    "lightcyan4": "rgb(122, 139, 139)",
    "lightgoldenrod": "rgb(238, 221, 130)",
    "lightgoldenrod1": "rgb(255, 236, 139)",
    "lightgoldenrod2": "rgb(238, 220, 130)",
    "lightgoldenrod3": "rgb(205, 190, 112)",
    "lightgoldenrod4": "rgb(139, 129, 76)",
    "lightgoldenrodyellow": "rgb(250, 250, 210)",
    "lightgray": "rgb(211, 211, 211)",
    "lightgreen": "rgb(144, 238, 144)",
    "lightgrey": "rgb(211, 211, 211)",
    "lightpink": "rgb(255, 182, 193)",
    "lightpink1": "rgb(255, 174, 185)",
    "lightpink2": "rgb(238, 162, 173)",
    "lightpink3": "rgb(205, 140, 149)",
    "lightpink4": "rgb(139, 95, 101)",
    "lightsalmon": "rgb(255, 160, 122)",
    "lightsalmon1": "rgb(255, 160, 122)",
    "lightsalmon2": "rgb(238, 149, 114)",
    "lightsalmon3": "rgb(205, 129, 98)",
    "lightsalmon4": "rgb(139, 87, 66)",
    "lightseagreen": "rgb(32, 178, 170)",
    "lightskyblue": "rgb(135, 206, 250)",
    "lightskyblue1": "rgb(176, 226, 255)",
    "lightskyblue2": "rgb(164, 211, 238)",
    "lightskyblue3": "rgb(141, 182, 205)",
    "lightskyblue4": "rgb(96, 123, 139)",
    "lightslateblue": "rgb(132, 112, 255)",
    "lightslategray": "rgb(119, 136, 153)",
    "lightslategrey": "rgb(119, 136, 153)",
    "lightsteelblue": "rgb(176, 196, 222)",
    "lightsteelblue1": "rgb(202, 225, 255)",
    "lightsteelblue2": "rgb(188, 210, 238)",
    "lightsteelblue3": "rgb(162, 181, 205)",
    "lightsteelblue4": "rgb(110, 123, 139)",
    "lightyellow": "rgb(255, 255, 224)",
    "lightyellow1": "rgb(255, 255, 224)",
    "lightyellow2": "rgb(238, 238, 209)",
    "lightyellow3": "rgb(205, 205, 180)",
    "lightyellow4": "rgb(139, 139, 122)",
    "limegreen": "rgb(50, 205, 50)",
    "linen": "rgb(250, 240, 230)",
    "magenta": "rgb(255, 0, 255)",
    "magenta1": "rgb(255, 0, 255)",
    "magenta2": "rgb(238, 0, 238)",
    "magenta3": "rgb(205, 0, 205)",
    "magenta4": "rgb(139, 0, 139)",
    "maroon": "rgb(176, 48, 96)",
    "maroon1": "rgb(255, 52, 179)",
    "maroon2": "rgb(238, 48, 167)",
    "maroon3": "rgb(205, 41, 144)",
    "maroon4": "rgb(139, 28, 98)",
    "mediumaquamarine": "rgb(102, 205, 170)",
    "mediumblue": "rgb(0, 0, 205)",
    "mediumorchid": "rgb(186, 85, 211)",
    "mediumorchid1": "rgb(224, 102, 255)",
    "mediumorchid2": "rgb(209, 95, 238)",
    "mediumorchid3": "rgb(180, 82, 205)",
    "mediumorchid4": "rgb(122, 55, 139)",
    "mediumpurple": "rgb(147, 112, 219)",
    "mediumpurple1": "rgb(171, 130, 255)",
    "mediumpurple2": "rgb(159, 121, 238)",
    "mediumpurple3": "rgb(137, 104, 205)",
    "mediumpurple4": "rgb(93, 71, 139)",
    "mediumseagreen": "rgb(60, 179, 113)",
    "mediumslateblue": "rgb(123, 104, 238)",
    "mediumspringgreen": "rgb(0, 250, 154)",
    "mediumturquoise": "rgb(72, 209, 204)",
    "mediumvioletred": "rgb(199, 21, 133)",
    "midnightblue": "rgb(25, 25, 112)",
    "mintcream": "rgb(245, 255, 250)",
    "mistyrose": "rgb(255, 228, 225)",
    "mistyrose1": "rgb(255, 228, 225)",
    "mistyrose2": "rgb(238, 213, 210)",
    "mistyrose3": "rgb(205, 183, 181)",
    "mistyrose4": "rgb(139, 125, 123)",
    "moccasin": "rgb(255, 228, 181)",
    "navajowhite": "rgb(255, 222, 173)",
    "navajowhite1": "rgb(255, 222, 173)",
    "navajowhite2": "rgb(238, 207, 161)",
    "navajowhite3": "rgb(205, 179, 139)",
    "navajowhite4": "rgb(139, 121, 94)",
    "navy": "rgb(0, 0, 128)",
    "navyblue": "rgb(0, 0, 128)",
    "oldlace": "rgb(253, 245, 230)",
    "olivedrab": "rgb(107, 142, 35)",
    "olivedrab1": "rgb(192, 255, 62)",
    "olivedrab2": "rgb(179, 238, 58)",
    "olivedrab3": "rgb(154, 205, 50)",
    "olivedrab4": "rgb(105, 139, 34)",
    "orange": "rgb(255, 165, 0)",
    "orange1": "rgb(255, 165, 0)",
    "orange2": "rgb(238, 154, 0)",
    "orange3": "rgb(205, 133, 0)",
    "orange4": "rgb(139, 90, 0)",
    "orangered": "rgb(255, 69, 0)",
    "orangered1": "rgb(255, 69, 0)",
    "orangered2": "rgb(238, 64, 0)",
    "orangered3": "rgb(205, 55, 0)",
    "orangered4": "rgb(139, 37, 0)",
    "orchid": "rgb(218, 112, 214)",
    "orchid1": "rgb(255, 131, 250)",
    "orchid2": "rgb(238, 122, 233)",
    "orchid3": "rgb(205, 105, 201)",
    "orchid4": "rgb(139, 71, 137)",
    "palegoldenrod": "rgb(238, 232, 170)",
    "palegreen": "rgb(152, 251, 152)",
    "palegreen1": "rgb(154, 255, 154)",
    "palegreen2": "rgb(144, 238, 144)",
    "palegreen3": "rgb(124, 205, 124)",
    "palegreen4": "rgb(84, 139, 84)",
    "paleturquoise": "rgb(175, 238, 238)",
    "paleturquoise1": "rgb(187, 255, 255)",
    "paleturquoise2": "rgb(174, 238, 238)",
    "paleturquoise3": "rgb(150, 205, 205)",
    "paleturquoise4": "rgb(102, 139, 139)",
    "palevioletred": "rgb(219, 112, 147)",
    "palevioletred1": "rgb(255, 130, 171)",
    "palevioletred2": "rgb(238, 121, 159)",
    "palevioletred3": "rgb(205, 104, 137)",
    "palevioletred4": "rgb(139, 71, 93)",
    "papayawhip": "rgb(255, 239, 213)",
    "peachpuff": "rgb(255, 218, 185)",
    "peachpuff1": "rgb(255, 218, 185)",
    "peachpuff2": "rgb(238, 203, 173)",
    "peachpuff3": "rgb(205, 175, 149)",
    "peachpuff4": "rgb(139, 119, 101)",
    "peru": "rgb(205, 133, 63)",
    "pink": "rgb(255, 192, 203)",
    "pink1": "rgb(255, 181, 197)",
    "pink2": "rgb(238, 169, 184)",
    "pink3": "rgb(205, 145, 158)",
    "pink4": "rgb(139, 99, 108)",
    "plum": "rgb(221, 160, 221)",
    "plum1": "rgb(255, 187, 255)",
    "plum2": "rgb(238, 174, 238)",
    "plum3": "rgb(205, 150, 205)",
    "plum4": "rgb(139, 102, 139)",
    "powderblue": "rgb(176, 224, 230)",
    "purple": "rgb(160, 32, 240)",
    "purple1": "rgb(155, 48, 255)",
    "purple2": "rgb(145, 44, 238)",
    "purple3": "rgb(125, 38, 205)",
    "purple4": "rgb(85, 26, 139)",
    "red": "rgb(255, 0, 0)",
    "red1": "rgb(255, 0, 0)",
    "red2": "rgb(238, 0, 0)",
    "red3": "rgb(205, 0, 0)",
    "red4": "rgb(139, 0, 0)",
    "rosybrown": "rgb(188, 143, 143)",
    "rosybrown1": "rgb(255, 193, 193)",
    "rosybrown2": "rgb(238, 180, 180)",
    "rosybrown3": "rgb(205, 155, 155)",
    "rosybrown4": "rgb(139, 105, 105)",
    "royalblue": "rgb(65, 105, 225)",
    "royalblue1": "rgb(72, 118, 255)",
    "royalblue2": "rgb(67, 110, 238)",
    "royalblue3": "rgb(58, 95, 205)",
    "royalblue4": "rgb(39, 64, 139)",
    "saddlebrown": "rgb(139, 69, 19)",
    "salmon": "rgb(250, 128, 114)",
    "salmon1": "rgb(255, 140, 105)",
    "salmon2": "rgb(238, 130, 98)",
    "salmon3": "rgb(205, 112, 84)",
    "salmon4": "rgb(139, 76, 57)",
    "sandybrown": "rgb(244, 164, 96)",
    "seagreen": "rgb(46, 139, 87)",
    "seagreen1": "rgb(84, 255, 159)",
    "seagreen2": "rgb(78, 238, 148)",
    "seagreen3": "rgb(67, 205, 128)",
    "seagreen4": "rgb(46, 139, 87)",
    "seashell": "rgb(255, 245, 238)",
    "seashell1": "rgb(255, 245, 238)",
    "seashell2": "rgb(238, 229, 222)",
    "seashell3": "rgb(205, 197, 191)",
    "seashell4": "rgb(139, 134, 130)",
    "sienna": "rgb(160, 82, 45)",
    "sienna1": "rgb(255, 130, 71)",
    "sienna2": "rgb(238, 121, 66)",
    "sienna3": "rgb(205, 104, 57)",
    "sienna4": "rgb(139, 71, 38)",
    "skyblue": "rgb(135, 206, 235)",
    "skyblue1": "rgb(135, 206, 255)",
    "skyblue2": "rgb(126, 192, 238)",
    "skyblue3": "rgb(108, 166, 205)",
    "skyblue4": "rgb(74, 112, 139)",
    "slateblue": "rgb(106, 90, 205)",
    "slateblue1": "rgb(131, 111, 255)",
    "slateblue2": "rgb(122, 103, 238)",
    "slateblue3": "rgb(105, 89, 205)",
    "slateblue4": "rgb(71, 60, 139)",
    "slategray": "rgb(112, 128, 144)",
    "slategray1": "rgb(198, 226, 255)",
    "slategray2": "rgb(185, 211, 238)",
    "slategray3": "rgb(159, 182, 205)",
    "slategray4": "rgb(108, 123, 139)",
    "slategrey": "rgb(112, 128, 144)",
    "snow": "rgb(255, 250, 250)",
    "snow1": "rgb(255, 250, 250)",
    "snow2": "rgb(238, 233, 233)",
    "snow3": "rgb(205, 201, 201)",
    "snow4": "rgb(139, 137, 137)",
    "springgreen": "rgb(0, 255, 127)",
    "springgreen1": "rgb(0, 255, 127)",
    "springgreen2": "rgb(0, 238, 118)",
    "springgreen3": "rgb(0, 205, 102)",
    "springgreen4": "rgb(0, 139, 69)",
    "steelblue": "rgb(70, 130, 180)",
    "steelblue1": "rgb(99, 184, 255)",
    "steelblue2": "rgb(92, 172, 238)",
    "steelblue3": "rgb(79, 148, 205)",
    "steelblue4": "rgb(54, 100, 139)",
    "tan": "rgb(210, 180, 140)",
    "tan1": "rgb(255, 165, 79)",
    "tan2": "rgb(238, 154, 73)",
    "tan3": "rgb(205, 133, 63)",
    "tan4": "rgb(139, 90, 43)",
    "thistle": "rgb(216, 191, 216)",
    "thistle1": "rgb(255, 225, 255)",
    "thistle2": "rgb(238, 210, 238)",
    "thistle3": "rgb(205, 181, 205)",
    "thistle4": "rgb(139, 123, 139)",
    "tomato": "rgb(255, 99, 71)",
    "tomato1": "rgb(255, 99, 71)",
    "tomato2": "rgb(238, 92, 66)",
    "tomato3": "rgb(205, 79, 57)",
    "tomato4": "rgb(139, 54, 38)",
    "turquoise": "rgb(64, 224, 208)",
    "turquoise1": "rgb(0, 245, 255)",
    "turquoise2": "rgb(0, 229, 238)",
    "turquoise3": "rgb(0, 197, 205)",
    "turquoise4": "rgb(0, 134, 139)",
    "violet": "rgb(238, 130, 238)",
    "violetred": "rgb(208, 32, 144)",
    "violetred1": "rgb(255, 62, 150)",
    "violetred2": "rgb(238, 58, 140)",
    "violetred3": "rgb(205, 50, 120)",
    "violetred4": "rgb(139, 34, 82)",
    "wheat": "rgb(245, 222, 179)",
    "wheat1": "rgb(255, 231, 186)",
    "wheat2": "rgb(238, 216, 174)",
    "wheat3": "rgb(205, 186, 150)",
    "wheat4": "rgb(139, 126, 102)",
    "white": "rgb(255, 255, 255)",
    "whitesmoke": "rgb(245, 245, 245)",
    "yellow": "rgb(255, 255, 0)",
    "yellow1": "rgb(255, 255, 0)",
    "yellow2": "rgb(238, 238, 0)",
    "yellow3": "rgb(205, 205, 0)",
    "yellow4": "rgb(139, 139, 0)",
    "yellowgreen": "rgb(154, 205, 50)"
};
"use strict";
lib.f = {};
lib.f.replaceVars = function (str, vars) {
    return str.replace(/%([a-z]*)\(([^\)]+)\)/gi, function (match, fn, varname) {
        if (typeof vars[varname] == "undefined")throw"Unknown variable: " + varname;
        var rv = vars[varname];
        if (fn in lib.f.replaceVars.functions)rv = lib.f.replaceVars.functions[fn](rv); else if (fn)throw"Unknown escape function: " + fn;
        return rv
    })
};
lib.f.replaceVars.functions = {
    encodeURI: encodeURI,
    encodeURIComponent: encodeURIComponent,
    escapeHTML: function (str) {
        var map = {"<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;"};
        return str.replace(/[<>&\"\']/g, function (m) {
            return map[m]
        })
    }
};
lib.f.getAcceptLanguages = function (callback) {
    if (window.chrome && chrome.i18n)chrome.i18n.getAcceptLanguages(callback); else setTimeout(function () {
        callback([navigator.language.replace(/-/g, "_")])
    }, 0)
};
lib.f.parseQuery = function (queryString) {
    if (queryString.substr(0, 1) == "?")queryString = queryString.substr(1);
    var rv = {};
    var pairs = queryString.split("&");
    for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i].split("=");
        rv[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1])
    }
    return rv
};
lib.f.getURL = function (path) {
    if (window.chrome && chrome.runtime && chrome.runtime.getURL)return chrome.runtime.getURL(path);
    return path
};
lib.f.clamp = function (v, min, max) {
    if (v < min)return min;
    if (v > max)return max;
    return v
};
lib.f.lpad = function (str, length, opt_ch) {
    str = String(str);
    opt_ch = opt_ch || " ";
    while (str.length < length)str = opt_ch + str;
    return str
};
lib.f.zpad = function (number, length) {
    return lib.f.lpad(number, length, "0")
};
lib.f.getWhitespace = function (length) {
    if (length == 0)return "";
    var f = this.getWhitespace;
    if (!f.whitespace)f.whitespace = "          ";
    while (length > f.whitespace.length)f.whitespace += f.whitespace;
    return f.whitespace.substr(0, length)
};
lib.f.alarm = function (callback, opt_ms) {
    var ms = opt_ms || 5 * 1E3;
    var stack = lib.f.getStack(1);
    return function () {
        var timeout = setTimeout(function () {
            var name = typeof callback == "string" ? name : callback.name;
            name = name ? ": " + name : "";
            console.warn("lib.f.alarm: timeout expired: " + ms / 1E3 + "s" + name);
            console.log(stack);
            timeout = null
        }, ms);
        var wrapperGenerator = function (callback) {
            return function () {
                if (timeout) {
                    clearTimeout(timeout);
                    timeout = null
                }
                return callback.apply(null, arguments)
            }
        };
        if (typeof callback == "string")return wrapperGenerator;
        return wrapperGenerator(callback)
    }()
};
lib.f.getStack = function (opt_ignoreFrames) {
    var ignoreFrames = opt_ignoreFrames ? opt_ignoreFrames + 2 : 2;
    var stackArray;
    try {
        throw new Error;
    } catch (ex) {
        stackArray = ex.stack.split("\n")
    }
    var stackObject = {};
    for (var i = ignoreFrames; i < stackArray.length; i++)stackObject[i - ignoreFrames] = stackArray[i].replace(/^\s*at\s+/, "");
    return stackObject
};
lib.f.smartFloorDivide = function (numerator, denominator) {
    var val = numerator / denominator;
    var ceiling = Math.ceil(val);
    if (ceiling - val < 1E-4)return ceiling; else return Math.floor(val)
};
"use strict";
lib.MessageManager = function (languages) {
    this.languages_ = languages.map(function (el) {
        return el.replace(/-/g, "_")
    });
    if (this.languages_.indexOf("en") == -1)this.languages_.unshift("en");
    this.messages = {}
};
lib.MessageManager.prototype.addMessages = function (defs) {
    for (var key in defs) {
        var def = defs[key];
        if (!def.placeholders)this.messages[key] = def.message; else this.messages[key] = def.message.replace(/\$([a-z][^\s\$]+)\$/ig, function (m, name) {
            return defs[key].placeholders[name.toLowerCase()].content
        })
    }
};
lib.MessageManager.prototype.findAndLoadMessages = function (pattern, onComplete) {
    var languages = this.languages_.concat();
    var loaded = [];
    var failed = [];

    function onLanguageComplete(state) {
        if (state)loaded = languages.shift(); else failed = languages.shift();
        if (languages.length)tryNextLanguage(); else onComplete(loaded, failed)
    }

    var tryNextLanguage = function () {
        this.loadMessages(this.replaceReferences(pattern, languages), onLanguageComplete.bind(this, true), onLanguageComplete.bind(this, false))
    }.bind(this);
    tryNextLanguage()
};
lib.MessageManager.prototype.loadMessages = function (url, onSuccess, opt_onError) {
    var xhr = new XMLHttpRequest;
    xhr.onloadend = function () {
        if (xhr.status != 200) {
            if (opt_onError)opt_onError(xhr.status);
            return
        }
        this.addMessages(JSON.parse(xhr.responseText));
        onSuccess()
    }.bind(this);
    xhr.open("GET", url);
    xhr.send()
};
lib.MessageManager.replaceReferences = function (msg, args) {
    return msg.replace(/\$(\d+)/g, function (m, index) {
        return args[index - 1]
    })
};
lib.MessageManager.prototype.replaceReferences = lib.MessageManager.replaceReferences;
lib.MessageManager.prototype.get = function (msgname, opt_args, opt_default) {
    var message;
    if (msgname in this.messages)message = this.messages[msgname]; else {
        if (window.chrome.i18n)message = chrome.i18n.getMessage(msgname);
        if (!message) {
            console.warn("Unknown message: " + msgname);
            return typeof opt_default == "undefined" ? msgname : opt_default
        }
    }
    if (!opt_args)return message;
    if (!(opt_args instanceof Array))opt_args = [opt_args];
    return this.replaceReferences(message, opt_args)
};
lib.MessageManager.prototype.processI18nAttributes = function (dom) {
    function thunk(str) {
        return str.replace(/-/g, "_").toUpperCase()
    }

    var nodes = dom.querySelectorAll("[i18n]");
    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        var i18n = node.getAttribute("i18n");
        if (!i18n)continue;
        try {
            i18n = JSON.parse(i18n)
        } catch (ex) {
            console.error("Can't parse " + node.tagName + "#" + node.id + ": " + i18n);
            throw ex;
        }
        for (var key in i18n) {
            var msgname = i18n[key];
            if (msgname.substr(0, 1) == "$")msgname = thunk(node.getAttribute(msgname.substr(1)) +
                "_" + key);
            var msg = this.get(msgname);
            if (key == "_")node.textContent = msg; else node.setAttribute(key, msg)
        }
    }
};
"use strict";
lib.PreferenceManager = function (storage, opt_prefix) {
    this.storage = storage;
    this.storageObserver_ = this.onStorageChange_.bind(this);
    this.isActive_ = false;
    this.activate();
    this.trace = false;
    var prefix = opt_prefix || "/";
    if (prefix.substr(prefix.length - 1) != "/")prefix += "/";
    this.prefix = prefix;
    this.prefRecords_ = {};
    this.globalObservers_ = [];
    this.childFactories_ = {};
    this.childLists_ = {}
};
lib.PreferenceManager.prototype.DEFAULT_VALUE = new String("DEFAULT");
lib.PreferenceManager.Record = function (name, defaultValue) {
    this.name = name;
    this.defaultValue = defaultValue;
    this.currentValue = this.DEFAULT_VALUE;
    this.observers = []
};
lib.PreferenceManager.Record.prototype.DEFAULT_VALUE = lib.PreferenceManager.prototype.DEFAULT_VALUE;
lib.PreferenceManager.Record.prototype.addObserver = function (observer) {
    this.observers.push(observer)
};
lib.PreferenceManager.Record.prototype.removeObserver = function (observer) {
    var i = this.observers.indexOf(observer);
    if (i >= 0)this.observers.splice(i, 1)
};
lib.PreferenceManager.Record.prototype.get = function () {
    if (this.currentValue === this.DEFAULT_VALUE) {
        if (/^(string|number)$/.test(typeof this.defaultValue))return this.defaultValue;
        if (typeof this.defaultValue == "object")return JSON.parse(JSON.stringify(this.defaultValue));
        return this.defaultValue
    }
    return this.currentValue
};
lib.PreferenceManager.prototype.deactivate = function () {
    if (!this.isActive_)throw new Error("Not activated");
    this.isActive_ = false;
    this.storage.removeObserver(this.storageObserver_)
};
lib.PreferenceManager.prototype.activate = function () {
    if (this.isActive_)throw new Error("Already activated");
    this.isActive_ = true;
    this.storage.addObserver(this.storageObserver_)
};
lib.PreferenceManager.prototype.readStorage = function (opt_callback) {
    var pendingChildren = 0;

    function onChildComplete() {
        if (--pendingChildren == 0 && opt_callback)opt_callback()
    }

    var keys = Object.keys(this.prefRecords_).map(function (el) {
        return this.prefix + el
    }.bind(this));
    if (this.trace)console.log("Preferences read: " + this.prefix);
    this.storage.getItems(keys, function (items) {
        var prefixLength = this.prefix.length;
        for (var key in items) {
            var value = items[key];
            var name = key.substr(prefixLength);
            var needSync = name in this.childLists_ &&
                JSON.stringify(value) != JSON.stringify(this.prefRecords_[name].currentValue);
            this.prefRecords_[name].currentValue = value;
            if (needSync) {
                pendingChildren++;
                this.syncChildList(name, onChildComplete)
            }
        }
        if (pendingChildren == 0 && opt_callback)setTimeout(opt_callback)
    }.bind(this))
};
lib.PreferenceManager.prototype.definePreference = function (name, value, opt_onChange) {
    var record = this.prefRecords_[name];
    if (record)this.changeDefault(name, value); else record = this.prefRecords_[name] = new lib.PreferenceManager.Record(name, value);
    if (opt_onChange)record.addObserver(opt_onChange)
};
lib.PreferenceManager.prototype.definePreferences = function (defaults) {
    for (var i = 0; i < defaults.length; i++)this.definePreference(defaults[i][0], defaults[i][1], defaults[i][2])
};
lib.PreferenceManager.prototype.defineChildren = function (listName, childFactory) {
    this.definePreference(listName, [], this.onChildListChange_.bind(this, listName));
    this.childFactories_[listName] = childFactory;
    this.childLists_[listName] = {}
};
lib.PreferenceManager.prototype.addObservers = function (global, map) {
    if (global && typeof global != "function")throw new Error("Invalid param: globals");
    if (global)this.globalObservers_.push(global);
    if (!map)return;
    for (var name in map) {
        if (!(name in this.prefRecords_))throw new Error("Unknown preference: " + name);
        this.prefRecords_[name].addObserver(map[name])
    }
};
lib.PreferenceManager.prototype.notifyAll = function () {
    for (var name in this.prefRecords_)this.notifyChange_(name)
};
lib.PreferenceManager.prototype.notifyChange_ = function (name) {
    var record = this.prefRecords_[name];
    if (!record)throw new Error("Unknown preference: " + name);
    var currentValue = record.get();
    for (var i = 0; i < this.globalObservers_.length; i++)this.globalObservers_[i](name, currentValue);
    for (var i = 0; i < record.observers.length; i++)record.observers[i](currentValue, name, this)
};
lib.PreferenceManager.prototype.createChild = function (listName, opt_hint, opt_id) {
    var ids = this.get(listName);
    var id;
    if (opt_id) {
        id = opt_id;
        if (ids.indexOf(id) != -1)throw new Error("Duplicate child: " + listName + ": " + id);
    } else while (!id || ids.indexOf(id) != -1) {
        id = Math.floor(Math.random() * 65535 + 1).toString(16);
        id = lib.f.zpad(id, 4);
        if (opt_hint)id = opt_hint + ":" + id
    }
    var childManager = this.childFactories_[listName](this, id);
    childManager.trace = this.trace;
    childManager.resetAll();
    this.childLists_[listName][id] = childManager;
    ids.push(id);
    this.set(listName, ids);
    return childManager
};
lib.PreferenceManager.prototype.removeChild = function (listName, id) {
    var prefs = this.getChild(listName, id);
    prefs.resetAll();
    var ids = this.get(listName);
    var i = ids.indexOf(id);
    if (i != -1) {
        ids.splice(i, 1);
        this.set(listName, ids)
    }
    delete this.childLists_[listName][id]
};
lib.PreferenceManager.prototype.getChild = function (listName, id, opt_default) {
    if (!(listName in this.childLists_))throw new Error("Unknown child list: " + listName);
    var childList = this.childLists_[listName];
    if (!(id in childList)) {
        if (typeof opt_default == "undefined")throw new Error('Unknown "' + listName + '" child: ' + id);
        return opt_default
    }
    return childList[id]
};
lib.PreferenceManager.diffChildLists = function (a, b) {
    var rv = {added: {}, removed: {}, common: {}};
    for (var i = 0; i < a.length; i++)if (b.indexOf(a[i]) != -1)rv.common[a[i]] = true; else rv.added[a[i]] = true;
    for (var i = 0; i < b.length; i++) {
        if (b[i] in rv.added || b[i] in rv.common)continue;
        rv.removed[b[i]] = true
    }
    return rv
};
lib.PreferenceManager.prototype.syncChildList = function (listName, opt_callback) {
    var pendingChildren = 0;

    function onChildStorage() {
        if (--pendingChildren == 0 && opt_callback)opt_callback()
    }

    var currentIds = this.get(listName);
    var oldIds = Object.keys(this.childLists_[listName]);
    var rv = lib.PreferenceManager.diffChildLists(currentIds, oldIds);
    for (var i = 0; i < currentIds.length; i++) {
        var id = currentIds[i];
        var managerIndex = oldIds.indexOf(id);
        if (managerIndex >= 0)oldIds.splice(managerIndex, 1);
        if (!this.childLists_[listName][id]) {
            var childManager =
                this.childFactories_[listName](this, id);
            if (!childManager) {
                console.warn("Unable to restore child: " + listName + ": " + id);
                continue
            }
            childManager.trace = this.trace;
            this.childLists_[listName][id] = childManager;
            pendingChildren++;
            childManager.readStorage(onChildStorage)
        }
    }
    for (var i = 0; i < oldIds.length; i++)delete this.childLists_[listName][oldIds[i]];
    if (!pendingChildren && opt_callback)setTimeout(opt_callback)
};
lib.PreferenceManager.prototype.reset = function (name) {
    var record = this.prefRecords_[name];
    if (!record)throw new Error("Unknown preference: " + name);
    this.storage.removeItem(this.prefix + name);
    if (record.currentValue !== this.DEFAULT_VALUE) {
        record.currentValue = this.DEFAULT_VALUE;
        this.notifyChange_(name)
    }
};
lib.PreferenceManager.prototype.resetAll = function () {
    var changed = [];
    for (var listName in this.childLists_) {
        var childList = this.childLists_[listName];
        for (var id in childList)childList[id].resetAll()
    }
    for (var name in this.prefRecords_)if (this.prefRecords_[name].currentValue !== this.DEFAULT_VALUE) {
        this.prefRecords_[name].currentValue = this.DEFAULT_VALUE;
        changed.push(name)
    }
    var keys = Object.keys(this.prefRecords_).map(function (el) {
        return this.prefix + el
    }.bind(this));
    this.storage.removeItems(keys);
    changed.forEach(this.notifyChange_.bind(this))
};
lib.PreferenceManager.prototype.diff = function (a, b) {
    if (typeof a !== typeof b || !/^(undefined|boolean|number|string)$/.test(typeof a))return true;
    return a !== b
};
lib.PreferenceManager.prototype.changeDefault = function (name, newValue) {
    var record = this.prefRecords_[name];
    if (!record)throw new Error("Unknown preference: " + name);
    if (!this.diff(record.defaultValue, newValue))return;
    if (record.currentValue !== this.DEFAULT_VALUE) {
        record.defaultValue = newValue;
        return
    }
    record.defaultValue = newValue;
    this.notifyChange_(name)
};
lib.PreferenceManager.prototype.changeDefaults = function (map) {
    for (var key in map)this.changeDefault(key, map[key])
};
lib.PreferenceManager.prototype.set = function (name, newValue) {
    var record = this.prefRecords_[name];
    if (!record)throw new Error("Unknown preference: " + name);
    var oldValue = record.get();
    if (!this.diff(oldValue, newValue))return;
    if (this.diff(record.defaultValue, newValue)) {
        record.currentValue = newValue;
        this.storage.setItem(this.prefix + name, newValue)
    } else {
        record.currentValue = this.DEFAULT_VALUE;
        this.storage.removeItem(this.prefix + name)
    }
    setTimeout(this.notifyChange_.bind(this, name), 0)
};
lib.PreferenceManager.prototype.get = function (name) {
    var record = this.prefRecords_[name];
    if (!record)throw new Error("Unknown preference: " + name);
    return record.get()
};
lib.PreferenceManager.prototype.exportAsJson = function () {
    var rv = {};
    for (var name in this.prefRecords_)if (name in this.childLists_) {
        rv[name] = [];
        var childIds = this.get(name);
        for (var i = 0; i < childIds.length; i++) {
            var id = childIds[i];
            rv[name].push({id: id, json: this.getChild(name, id).exportAsJson()})
        }
    } else {
        var record = this.prefRecords_[name];
        if (record.currentValue != this.DEFAULT_VALUE)rv[name] = record.currentValue
    }
    return rv
};
lib.PreferenceManager.prototype.importFromJson = function (json) {
    for (var name in json)if (name in this.childLists_) {
        var childList = json[name];
        for (var i = 0; i < childList.length; i++) {
            var id = childList[i].id;
            var childPrefManager = this.childLists_[name][id];
            if (!childPrefManager)childPrefManager = this.createChild(name, null, id);
            childPrefManager.importFromJson(childList[i].json)
        }
    } else this.set(name, json[name])
};
lib.PreferenceManager.prototype.onChildListChange_ = function (listName) {
    this.syncChildList(listName)
};
lib.PreferenceManager.prototype.onStorageChange_ = function (map) {
    for (var key in map) {
        if (this.prefix)if (key.lastIndexOf(this.prefix, 0) != 0)continue;
        var name = key.substr(this.prefix.length);
        if (!(name in this.prefRecords_))continue;
        var record = this.prefRecords_[name];
        var newValue = map[key].newValue;
        var currentValue = record.currentValue;
        if (currentValue === record.DEFAULT_VALUE)currentValue = void 0;
        if (this.diff(currentValue, newValue)) {
            if (typeof newValue == "undefined")record.currentValue = record.DEFAULT_VALUE; else record.currentValue =
                newValue;
            this.notifyChange_(name)
        }
    }
};
"use strict";
lib.resource = {resources_: {}};
lib.resource.add = function (name, type, data) {
    lib.resource.resources_[name] = {type: type, name: name, data: data}
};
lib.resource.get = function (name, opt_defaultValue) {
    if (!(name in lib.resource.resources_)) {
        if (typeof opt_defaultValue == "undefined")throw"Unknown resource: " + name;
        return opt_defaultValue
    }
    return lib.resource.resources_[name]
};
lib.resource.getData = function (name, opt_defaultValue) {
    if (!(name in lib.resource.resources_)) {
        if (typeof opt_defaultValue == "undefined")throw"Unknown resource: " + name;
        return opt_defaultValue
    }
    return lib.resource.resources_[name].data
};
lib.resource.getDataUrl = function (name, opt_defaultValue) {
    var resource = lib.resource.get(name, opt_defaultValue);
    return "data:" + resource.type + "," + resource.data
};
"use strict";
lib.Storage = new Object;
"use strict";
lib.Storage.Chrome = function (storage) {
    this.storage_ = storage;
    this.observers_ = [];
    chrome.storage.onChanged.addListener(this.onChanged_.bind(this))
};
lib.Storage.Chrome.prototype.onChanged_ = function (changes, areaname) {
    if (chrome.storage[areaname] != this.storage_)return;
    for (var i = 0; i < this.observers_.length; i++)this.observers_[i](changes)
};
lib.Storage.Chrome.prototype.addObserver = function (callback) {
    this.observers_.push(callback)
};
lib.Storage.Chrome.prototype.removeObserver = function (callback) {
    var i = this.observers_.indexOf(callback);
    if (i != -1)this.observers_.splice(i, 1)
};
lib.Storage.Chrome.prototype.clear = function (opt_callback) {
    this.storage_.clear();
    if (opt_callback)setTimeout(opt_callback, 0)
};
lib.Storage.Chrome.prototype.getItem = function (key, callback) {
    this.storage_.get(key, callback)
};
lib.Storage.Chrome.prototype.getItems = function (keys, callback) {
    this.storage_.get(keys, callback)
};
lib.Storage.Chrome.prototype.setItem = function (key, value, opt_callback) {
    var obj = {};
    obj[key] = value;
    this.storage_.set(obj, opt_callback)
};
lib.Storage.Chrome.prototype.setItems = function (obj, opt_callback) {
    this.storage_.set(obj, opt_callback)
};
lib.Storage.Chrome.prototype.removeItem = function (key, opt_callback) {
    this.storage_.remove(key, opt_callback)
};
lib.Storage.Chrome.prototype.removeItems = function (keys, opt_callback) {
    this.storage_.remove(keys, opt_callback)
};
"use strict";
lib.Storage.Local = function () {
    this.observers_ = [];
    this.storage_ = window.localStorage;
    window.addEventListener("storage", this.onStorage_.bind(this))
};
lib.Storage.Local.prototype.onStorage_ = function (e) {
    if (e.storageArea != this.storage_)return;
    var prevValue = e.oldValue ? JSON.parse(e.oldValue) : "";
    var curValue = e.newValue ? JSON.parse(e.newValue) : "";
    var o = {};
    o[e.key] = {oldValue: prevValue, newValue: curValue};
    for (var i = 0; i < this.observers_.length; i++)this.observers_[i](o)
};
lib.Storage.Local.prototype.addObserver = function (callback) {
    this.observers_.push(callback)
};
lib.Storage.Local.prototype.removeObserver = function (callback) {
    var i = this.observers_.indexOf(callback);
    if (i != -1)this.observers_.splice(i, 1)
};
lib.Storage.Local.prototype.clear = function (opt_callback) {
    this.storage_.clear();
    if (opt_callback)setTimeout(opt_callback, 0)
};
lib.Storage.Local.prototype.getItem = function (key, callback) {
    var value = this.storage_.getItem(key);
    if (typeof value == "string")try {
        value = JSON.parse(value)
    } catch (e) {
    }
    setTimeout(callback.bind(null, value), 0)
};
lib.Storage.Local.prototype.getItems = function (keys, callback) {
    var rv = {};
    for (var i = keys.length - 1; i >= 0; i--) {
        var key = keys[i];
        var value = this.storage_.getItem(key);
        if (typeof value == "string")try {
            rv[key] = JSON.parse(value)
        } catch (e) {
            rv[key] = value
        } else keys.splice(i, 1)
    }
    setTimeout(callback.bind(null, rv), 0)
};
lib.Storage.Local.prototype.setItem = function (key, value, opt_callback) {
    this.storage_.setItem(key, JSON.stringify(value));
    if (opt_callback)setTimeout(opt_callback, 0)
};
lib.Storage.Local.prototype.setItems = function (obj, opt_callback) {
    for (var key in obj)this.storage_.setItem(key, JSON.stringify(obj[key]));
    if (opt_callback)setTimeout(opt_callback, 0)
};
lib.Storage.Local.prototype.removeItem = function (key, opt_callback) {
    this.storage_.removeItem(key);
    if (opt_callback)setTimeout(opt_callback, 0)
};
lib.Storage.Local.prototype.removeItems = function (ary, opt_callback) {
    for (var i = 0; i < ary.length; i++)this.storage_.removeItem(ary[i]);
    if (opt_callback)setTimeout(opt_callback, 0)
};
"use strict";
lib.Storage.Memory = function () {
    this.observers_ = [];
    this.storage_ = {}
};
lib.Storage.Memory.prototype.addObserver = function (callback) {
    this.observers_.push(callback)
};
lib.Storage.Memory.prototype.removeObserver = function (callback) {
    var i = this.observers_.indexOf(callback);
    if (i != -1)this.observers_.splice(i, 1)
};
lib.Storage.Memory.prototype.clear = function (opt_callback) {
    var e = {};
    for (var key in this.storage_)e[key] = {oldValue: this.storage_[key], newValue: void 0};
    this.storage_ = {};
    setTimeout(function () {
        for (var i = 0; i < this.observers_.length; i++)this.observers_[i](e)
    }.bind(this), 0);
    if (opt_callback)setTimeout(opt_callback, 0)
};
lib.Storage.Memory.prototype.getItem = function (key, callback) {
    var value = this.storage_[key];
    if (typeof value == "string")try {
        value = JSON.parse(value)
    } catch (e) {
    }
    setTimeout(callback.bind(null, value), 0)
};
lib.Storage.Memory.prototype.getItems = function (keys, callback) {
    var rv = {};
    for (var i = keys.length - 1; i >= 0; i--) {
        var key = keys[i];
        var value = this.storage_[key];
        if (typeof value == "string")try {
            rv[key] = JSON.parse(value)
        } catch (e) {
            rv[key] = value
        } else keys.splice(i, 1)
    }
    setTimeout(callback.bind(null, rv), 0)
};
lib.Storage.Memory.prototype.setItem = function (key, value, opt_callback) {
    var oldValue = this.storage_[key];
    this.storage_[key] = JSON.stringify(value);
    var e = {};
    e[key] = {oldValue: oldValue, newValue: value};
    setTimeout(function () {
        for (var i = 0; i < this.observers_.length; i++)this.observers_[i](e)
    }.bind(this), 0);
    if (opt_callback)setTimeout(opt_callback, 0)
};
lib.Storage.Memory.prototype.setItems = function (obj, opt_callback) {
    var e = {};
    for (var key in obj) {
        e[key] = {oldValue: this.storage_[key], newValue: obj[key]};
        this.storage_[key] = JSON.stringify(obj[key])
    }
    setTimeout(function () {
        for (var i = 0; i < this.observers_.length; i++)this.observers_[i](e)
    }.bind(this));
    if (opt_callback)setTimeout(opt_callback, 0)
};
lib.Storage.Memory.prototype.removeItem = function (key, opt_callback) {
    delete this.storage_[key];
    if (opt_callback)setTimeout(opt_callback, 0)
};
lib.Storage.Memory.prototype.removeItems = function (ary, opt_callback) {
    for (var i = 0; i < ary.length; i++)delete this.storage_[ary[i]];
    if (opt_callback)setTimeout(opt_callback, 0)
};
"use strict";
lib.TestManager = function (opt_log) {
    this.log = opt_log || new lib.TestManager.Log
};
lib.TestManager.prototype.createTestRun = function (opt_cx) {
    return new lib.TestManager.TestRun(this, opt_cx)
};
lib.TestManager.prototype.onTestRunComplete = function (testRun) {
};
lib.TestManager.Log = function (opt_logFunction) {
    this.logFunction_ = opt_logFunction || function (s) {
            console.log(s)
        };
    this.pending_ = "";
    this.prefix_ = "";
    this.prefixStack_ = []
};
lib.TestManager.Log.prototype.pushPrefix = function (str) {
    this.prefixStack_.push(str);
    this.prefix_ = this.prefixStack_.join("")
};
lib.TestManager.Log.prototype.popPrefix = function () {
    this.prefixStack_.pop();
    this.prefix_ = this.prefixStack_.join("")
};
lib.TestManager.Log.prototype.print = function (str) {
    if (this.pending_)this.pending_ += str; else this.pending_ = this.prefix_ + str
};
lib.TestManager.Log.prototype.println = function (str) {
    if (this.pending_)this.flush();
    this.logFunction_(this.prefix_ + str)
};
lib.TestManager.Log.prototype.flush = function () {
    if (!this.pending_)return;
    this.logFunction_(this.pending_);
    this.pending_ = ""
};
lib.TestManager.Suite = function (suiteName) {
    function ctor(testManager, cx) {
        this.testManager_ = testManager;
        this.suiteName = suiteName;
        this.setup(cx)
    }

    ctor.suiteName = suiteName;
    ctor.addTest = lib.TestManager.Suite.addTest;
    ctor.disableTest = lib.TestManager.Suite.disableTest;
    ctor.getTest = lib.TestManager.Suite.getTest;
    ctor.getTestList = lib.TestManager.Suite.getTestList;
    ctor.testList_ = [];
    ctor.testMap_ = {};
    ctor.prototype = {__proto__: lib.TestManager.Suite.prototype};
    lib.TestManager.Suite.subclasses.push(ctor);
    return ctor
};
lib.TestManager.Suite.subclasses = [];
lib.TestManager.Suite.addTest = function (testName, testFunction) {
    if (testName in this.testMap_)throw"Duplicate test name: " + testName;
    var test = new lib.TestManager.Test(this, testName, testFunction);
    this.testMap_[testName] = test;
    this.testList_.push(test)
};
lib.TestManager.Suite.disableTest = function (testName, testFunction) {
    if (testName in this.testMap_)throw"Duplicate test name: " + testName;
    var test = new lib.TestManager.Test(this, testName, testFunction);
    console.log("Disabled test: " + test.fullName)
};
lib.TestManager.Suite.getTest = function (testName) {
    return this.testMap_[testName]
};
lib.TestManager.Suite.getTestList = function () {
    return this.testList_
};
lib.TestManager.Suite.prototype.setDefaults = function (cx, defaults) {
    for (var k in defaults)this[k] = k in cx ? cx[k] : defaults[k]
};
lib.TestManager.Suite.prototype.setup = function (cx) {
};
lib.TestManager.Suite.prototype.preamble = function (result, cx) {
};
lib.TestManager.Suite.prototype.postamble = function (result, cx) {
};
lib.TestManager.Test = function (suiteClass, testName, testFunction) {
    this.suiteClass = suiteClass;
    this.testName = testName;
    this.fullName = suiteClass.suiteName + "[" + testName + "]";
    this.testFunction_ = testFunction
};
lib.TestManager.Test.prototype.run = function (result) {
    try {
        this.testFunction_.apply(result.suite, [result, result.testRun.cx])
    } catch (ex) {
        if (ex instanceof lib.TestManager.Result.TestComplete)return;
        result.println("Test raised an exception: " + ex);
        if (ex.stack)if (ex.stack instanceof Array)result.println(ex.stack.join("\n")); else result.println(ex.stack);
        result.completeTest_(result.FAILED, false)
    }
};
lib.TestManager.TestRun = function (testManager, cx) {
    this.testManager = testManager;
    this.log = testManager.log;
    this.cx = cx || {};
    this.failures = [];
    this.passes = [];
    this.startDate = null;
    this.duration = null;
    this.currentResult = null;
    this.maxFailures = 0;
    this.panic = false;
    this.testQueue_ = []
};
lib.TestManager.TestRun.prototype.ALL_TESTS = new String("<all-tests>");
lib.TestManager.TestRun.prototype.selectTest = function (test) {
    this.testQueue_.push(test)
};
lib.TestManager.TestRun.prototype.selectSuite = function (suiteClass, opt_pattern) {
    var pattern = opt_pattern || this.ALL_TESTS;
    var selectCount = 0;
    var testList = suiteClass.getTestList();
    for (var j = 0; j < testList.length; j++) {
        var test = testList[j];
        if (pattern !== this.ALL_TESTS)if (pattern instanceof RegExp) {
            if (!pattern.test(test.testName))continue
        } else if (test.testName != pattern)continue;
        this.selectTest(test);
        selectCount++
    }
    return selectCount
};
lib.TestManager.TestRun.prototype.selectPattern = function (pattern) {
    var selectCount = 0;
    for (var i = 0; i < lib.TestManager.Suite.subclasses.length; i++)selectCount += this.selectSuite(lib.TestManager.Suite.subclasses[i], pattern);
    if (!selectCount)this.log.println("No tests matched selection criteria: " + pattern);
    return selectCount
};
lib.TestManager.TestRun.prototype.onUncaughtException_ = function (message, file, line) {
    if (message.indexOf("Uncaught lib.TestManager.Result.TestComplete") == 0 || message.indexOf("status: passed") != -1)return true;
    if (!this.currentResult)return;
    if (message == "Uncaught " + this.currentResult.expectedErrorMessage_)return;
    var when = "during";
    if (this.currentResult.status != this.currentResult.PENDING)when = "after";
    this.log.println("Uncaught exception " + when + " test case: " + this.currentResult.test.fullName);
    this.log.println(message +
        ", " + file + ":" + line);
    this.currentResult.completeTest_(this.currentResult.FAILED, false);
    return false
};
lib.TestManager.TestRun.prototype.onTestRunComplete_ = function (opt_skipTimeout) {
    if (!opt_skipTimeout) {
        setTimeout(this.onTestRunComplete_.bind(this), 0, true);
        return
    }
    this.duration = new Date - this.startDate;
    this.log.popPrefix();
    this.log.println("} " + this.passes.length + " passed, " + this.failures.length + " failed, " + this.msToSeconds_(this.duration));
    this.log.println("");
    this.summarize();
    window.onerror = null;
    this.testManager.onTestRunComplete(this)
};
lib.TestManager.TestRun.prototype.onResultComplete = function (result) {
    try {
        result.suite.postamble()
    } catch (ex) {
        this.log.println("Unexpected exception in postamble: " + (ex.stack ? ex.stack : ex));
        this.panic = true
    }
    this.log.popPrefix();
    this.log.print("} " + result.status + ", " + this.msToSeconds_(result.duration));
    this.log.flush();
    if (result.status == result.FAILED) {
        this.failures.push(result);
        this.currentSuite = null
    } else if (result.status == result.PASSED)this.passes.push(result); else {
        this.log.println("Unknown result status: " +
            result.test.fullName + ": " + result.status);
        return this.panic = true
    }
    this.runNextTest_()
};
lib.TestManager.TestRun.prototype.onResultReComplete = function (result, lateStatus) {
    this.log.println("Late complete for test: " + result.test.fullName + ": " + lateStatus);
    var index = this.passes.indexOf(result);
    if (index >= 0) {
        this.passes.splice(index, 1);
        this.failures.push(result)
    }
};
lib.TestManager.TestRun.prototype.runNextTest_ = function () {
    if (this.panic || !this.testQueue_.length)return this.onTestRunComplete_();
    if (this.maxFailures && this.failures.length >= this.maxFailures) {
        this.log.println("Maximum failure count reached, aborting test run.");
        return this.onTestRunComplete_()
    }
    var test = this.testQueue_[0];
    var suite = this.currentResult ? this.currentResult.suite : null;
    try {
        if (!suite || !(suite instanceof test.suiteClass)) {
            this.log.println("Initializing suite: " + test.suiteClass.suiteName);
            suite =
                new test.suiteClass(this.testManager, this.cx)
        }
    } catch (ex) {
        this.log.println("Exception during setup: " + (ex.stack ? ex.stack : ex));
        this.panic = true;
        this.onTestRunComplete_();
        return
    }
    try {
        this.log.print("Test: " + test.fullName + " {");
        this.log.pushPrefix("  ");
        this.currentResult = new lib.TestManager.Result(this, suite, test);
        suite.preamble(this.currentResult, this.cx);
        this.testQueue_.shift()
    } catch (ex$0) {
        this.log.println("Unexpected exception during test preamble: " + (ex$0.stack ? ex$0.stack : ex$0));
        this.log.popPrefix();
        this.log.println("}");
        this.panic = true;
        this.onTestRunComplete_();
        return
    }
    try {
        this.currentResult.run()
    } catch (ex$1) {
        this.log.println("Unexpected exception during test run: " + (ex$1.stack ? ex$1.stack : ex$1));
        this.panic = true
    }
};
lib.TestManager.TestRun.prototype.run = function () {
    this.log.println("Running " + this.testQueue_.length + " test(s) {");
    this.log.pushPrefix("  ");
    window.onerror = this.onUncaughtException_.bind(this);
    this.startDate = new Date;
    this.runNextTest_()
};
lib.TestManager.TestRun.prototype.msToSeconds_ = function (ms) {
    var secs = (ms / 1E3).toFixed(2);
    return secs + "s"
};
lib.TestManager.TestRun.prototype.summarize = function () {
    if (this.failures.length)for (var i = 0; i < this.failures.length; i++)this.log.println("FAILED: " + this.failures[i].test.fullName);
    if (this.testQueue_.length)this.log.println("Test run incomplete: " + this.testQueue_.length + " test(s) were not run.")
};
lib.TestManager.Result = function (testRun, suite, test) {
    this.testRun = testRun;
    this.suite = suite;
    this.test = test;
    this.startDate = null;
    this.duration = null;
    this.status = this.PENDING;
    this.expectedErrorMessage_ = null
};
lib.TestManager.Result.prototype.PENDING = "pending";
lib.TestManager.Result.prototype.FAILED = "FAILED";
lib.TestManager.Result.prototype.PASSED = "passed";
lib.TestManager.Result.TestComplete = function (result) {
    this.result = result
};
lib.TestManager.Result.TestComplete.prototype.toString = function () {
    return "lib.TestManager.Result.TestComplete: " + this.result.test.fullName + ", status: " + this.result.status
};
lib.TestManager.Result.prototype.run = function () {
    var self = this;
    this.startDate = new Date;
    this.test.run(this);
    if (this.status == this.PENDING && !this.timeout_) {
        this.println("Test did not return a value and did not request more time.");
        this.completeTest_(this.FAILED, false)
    }
};
lib.TestManager.Result.prototype.expectErrorMessage = function (str) {
    this.expectedErrorMessage_ = str
};
lib.TestManager.Result.prototype.onTimeout_ = function () {
    this.timeout_ = null;
    if (this.status != this.PENDING)return;
    this.println("Test timed out.");
    this.completeTest_(this.FAILED, false)
};
lib.TestManager.Result.prototype.requestTime = function (ms) {
    if (this.timeout_)clearTimeout(this.timeout_);
    this.timeout_ = setTimeout(this.onTimeout_.bind(this), ms)
};
lib.TestManager.Result.prototype.completeTest_ = function (status, opt_throw) {
    if (this.status == this.PENDING) {
        this.duration = new Date - this.startDate;
        this.status = status;
        this.testRun.onResultComplete(this)
    } else this.testRun.onResultReComplete(this, status);
    if (arguments.length < 2 || opt_throw)throw new lib.TestManager.Result.TestComplete(this);
};
lib.TestManager.Result.prototype.assertEQ = function (actual, expected, opt_name) {
    function format(value) {
        if (typeof value == "number")return value;
        var str = String(value);
        var ary = str.split("\n").map(function (e) {
            return JSON.stringify(e)
        });
        if (ary.length > 1)return "\n" + ary.join("\n"); else return ary.join("\n")
    }

    if (actual === expected)return;
    var name = opt_name ? "[" + opt_name + "]" : "";
    this.fail("assertEQ" + name + ": " + this.getCallerLocation_(1) + ": " + format(actual) + " !== " + format(expected))
};
lib.TestManager.Result.prototype.assert = function (actual, opt_name) {
    if (actual === true)return;
    var name = opt_name ? "[" + opt_name + "]" : "";
    this.fail("assert" + name + ": " + this.getCallerLocation_(1) + ": " + String(actual))
};
lib.TestManager.Result.prototype.getCallerLocation_ = function (frameIndex) {
    try {
        throw new Error;
    } catch (ex) {
        var frame = ex.stack.split("\n")[frameIndex + 2];
        var ary = frame.match(/([^/]+:\d+):\d+\)?$/);
        return ary ? ary[1] : "???"
    }
};
lib.TestManager.Result.prototype.println = function (message) {
    this.testRun.log.println(message)
};
lib.TestManager.Result.prototype.fail = function (opt_message) {
    if (arguments.length)this.println(opt_message);
    this.completeTest_(this.FAILED, true)
};
lib.TestManager.Result.prototype.pass = function () {
    this.completeTest_(this.PASSED, true)
};
"use strict";
lib.UTF8Decoder = function () {
    this.bytesLeft = 0;
    this.codePoint = 0;
    this.lowerBound = 0
};
lib.UTF8Decoder.prototype.decode = function (str) {
    var ret = "";
    for (var i = 0; i < str.length; i++) {
        var c = str.charCodeAt(i);
        if (this.bytesLeft == 0)if (c <= 127)ret += str.charAt(i); else if (192 <= c && c <= 223) {
            this.codePoint = c - 192;
            this.bytesLeft = 1;
            this.lowerBound = 128
        } else if (224 <= c && c <= 239) {
            this.codePoint = c - 224;
            this.bytesLeft = 2;
            this.lowerBound = 2048
        } else if (240 <= c && c <= 247) {
            this.codePoint = c - 240;
            this.bytesLeft = 3;
            this.lowerBound = 65536
        } else if (248 <= c && c <= 251) {
            this.codePoint = c - 248;
            this.bytesLeft = 4;
            this.lowerBound = 2097152
        } else if (252 <=
            c && c <= 253) {
            this.codePoint = c - 252;
            this.bytesLeft = 5;
            this.lowerBound = 67108864
        } else ret += "\ufffd"; else if (128 <= c && c <= 191) {
            this.bytesLeft--;
            this.codePoint = (this.codePoint << 6) + (c - 128);
            if (this.bytesLeft == 0) {
                var codePoint = this.codePoint;
                if (codePoint < this.lowerBound || 55296 <= codePoint && codePoint <= 57343 || codePoint > 1114111)ret += "\ufffd"; else if (codePoint < 65536)ret += String.fromCharCode(codePoint); else {
                    codePoint -= 65536;
                    ret += String.fromCharCode(55296 + (codePoint >>> 10 & 1023), 56320 + (codePoint & 1023))
                }
            }
        } else {
            ret += "\ufffd";
            this.bytesLeft = 0;
            i--
        }
    }
    return ret
};
lib.decodeUTF8 = function (utf8) {
    return (new lib.UTF8Decoder).decode(utf8)
};
lib.encodeUTF8 = function (str) {
    var ret = "";
    for (var i = 0; i < str.length; i++) {
        var c = str.charCodeAt(i);
        if (56320 <= c && c <= 57343)c = 65533; else if (55296 <= c && c <= 56319)if (i + 1 < str.length) {
            var d = str.charCodeAt(i + 1);
            if (56320 <= d && d <= 57343) {
                c = 65536 + ((c & 1023) << 10) + (d & 1023);
                i++
            } else c = 65533
        } else c = 65533;
        var bytesLeft;
        if (c <= 127) {
            ret += str.charAt(i);
            continue
        } else if (c <= 2047) {
            ret += String.fromCharCode(192 | c >>> 6);
            bytesLeft = 1
        } else if (c <= 65535) {
            ret += String.fromCharCode(224 | c >>> 12);
            bytesLeft = 2
        } else {
            ret += String.fromCharCode(240 | c >>>
                18);
            bytesLeft = 3
        }
        while (bytesLeft > 0) {
            bytesLeft--;
            ret += String.fromCharCode(128 | c >>> 6 * bytesLeft & 63)
        }
    }
    return ret
};
"use strict";
if (!String.prototype.codePointAt)(function () {
    var codePointAt = function (position) {
        if (this == null)throw TypeError();
        var string = String(this);
        var size = string.length;
        var index = position ? Number(position) : 0;
        if (index != index)index = 0;
        if (index < 0 || index >= size)return undefined;
        var first = string.charCodeAt(index);
        var second;
        if (first >= 55296 && first <= 56319 && size > index + 1) {
            second = string.charCodeAt(index + 1);
            if (second >= 56320 && second <= 57343)return (first - 55296) * 1024 + second - 56320 + 65536
        }
        return first
    };
    if (Object.defineProperty)Object.defineProperty(String.prototype,
        "codePointAt", {
            "value": codePointAt,
            "configurable": true,
            "writable": true
        }); else String.prototype.codePointAt = codePointAt
})();
lib.wc = {};
lib.wc.nulWidth = 0;
lib.wc.controlWidth = 0;
lib.wc.regardCjkAmbiguous = false;
lib.wc.cjkAmbiguousWidth = 2;
lib.wc.combining = [[768, 879], [1155, 1158], [1160, 1161], [1425, 1469], [1471, 1471], [1473, 1474], [1476, 1477], [1479, 1479], [1536, 1539], [1552, 1557], [1611, 1630], [1648, 1648], [1750, 1764], [1767, 1768], [1770, 1773], [1807, 1807], [1809, 1809], [1840, 1866], [1958, 1968], [2027, 2035], [2305, 2306], [2364, 2364], [2369, 2376], [2381, 2381], [2385, 2388], [2402, 2403], [2433, 2433], [2492, 2492], [2497, 2500], [2509, 2509], [2530, 2531], [2561, 2562], [2620, 2620], [2625, 2626], [2631, 2632], [2635, 2637], [2672, 2673], [2689, 2690], [2748, 2748], [2753, 2757], [2759,
    2760], [2765, 2765], [2786, 2787], [2817, 2817], [2876, 2876], [2879, 2879], [2881, 2883], [2893, 2893], [2902, 2902], [2946, 2946], [3008, 3008], [3021, 3021], [3134, 3136], [3142, 3144], [3146, 3149], [3157, 3158], [3260, 3260], [3263, 3263], [3270, 3270], [3276, 3277], [3298, 3299], [3393, 3395], [3405, 3405], [3530, 3530], [3538, 3540], [3542, 3542], [3633, 3633], [3636, 3642], [3655, 3662], [3761, 3761], [3764, 3769], [3771, 3772], [3784, 3789], [3864, 3865], [3893, 3893], [3895, 3895], [3897, 3897], [3953, 3966], [3968, 3972], [3974, 3975], [3984, 3991], [3993, 4028], [4038,
    4038], [4141, 4144], [4146, 4146], [4150, 4151], [4153, 4153], [4184, 4185], [4448, 4607], [4959, 4959], [5906, 5908], [5938, 5940], [5970, 5971], [6002, 6003], [6068, 6069], [6071, 6077], [6086, 6086], [6089, 6099], [6109, 6109], [6155, 6157], [6313, 6313], [6432, 6434], [6439, 6440], [6450, 6450], [6457, 6459], [6679, 6680], [6912, 6915], [6964, 6964], [6966, 6970], [6972, 6972], [6978, 6978], [7019, 7027], [7616, 7626], [7678, 7679], [8203, 8207], [8234, 8238], [8288, 8291], [8298, 8303], [8400, 8431], [12330, 12335], [12441, 12442], [43014, 43014], [43019, 43019], [43045,
    43046], [64286, 64286], [65024, 65039], [65056, 65059], [65279, 65279], [65529, 65531], [68097, 68099], [68101, 68102], [68108, 68111], [68152, 68154], [68159, 68159], [119143, 119145], [119155, 119170], [119173, 119179], [119210, 119213], [119362, 119364], [917505, 917505], [917536, 917631], [917760, 917999]];
lib.wc.ambiguous = [[161, 161], [164, 164], [167, 168], [170, 170], [174, 174], [176, 180], [182, 186], [188, 191], [198, 198], [208, 208], [215, 216], [222, 225], [230, 230], [232, 234], [236, 237], [240, 240], [242, 243], [247, 250], [252, 252], [254, 254], [257, 257], [273, 273], [275, 275], [283, 283], [294, 295], [299, 299], [305, 307], [312, 312], [319, 322], [324, 324], [328, 331], [333, 333], [338, 339], [358, 359], [363, 363], [462, 462], [464, 464], [466, 466], [468, 468], [470, 470], [472, 472], [474, 474], [476, 476], [593, 593], [609, 609], [708, 708], [711, 711], [713, 715], [717,
    717], [720, 720], [728, 731], [733, 733], [735, 735], [913, 929], [931, 937], [945, 961], [963, 969], [1025, 1025], [1040, 1103], [1105, 1105], [8208, 8208], [8211, 8214], [8216, 8217], [8220, 8221], [8224, 8226], [8228, 8231], [8240, 8240], [8242, 8243], [8245, 8245], [8251, 8251], [8254, 8254], [8308, 8308], [8319, 8319], [8321, 8324], [8364, 8364], [8451, 8451], [8453, 8453], [8457, 8457], [8467, 8467], [8470, 8470], [8481, 8482], [8486, 8486], [8491, 8491], [8531, 8532], [8539, 8542], [8544, 8555], [8560, 8569], [8592, 8601], [8632, 8633], [8658, 8658], [8660, 8660], [8679, 8679],
    [8704, 8704], [8706, 8707], [8711, 8712], [8715, 8715], [8719, 8719], [8721, 8721], [8725, 8725], [8730, 8730], [8733, 8736], [8739, 8739], [8741, 8741], [8743, 8748], [8750, 8750], [8756, 8759], [8764, 8765], [8776, 8776], [8780, 8780], [8786, 8786], [8800, 8801], [8804, 8807], [8810, 8811], [8814, 8815], [8834, 8835], [8838, 8839], [8853, 8853], [8857, 8857], [8869, 8869], [8895, 8895], [8978, 8978], [9312, 9449], [9451, 9547], [9552, 9587], [9600, 9615], [9618, 9621], [9632, 9633], [9635, 9641], [9650, 9651], [9654, 9655], [9660, 9661], [9664, 9665], [9670, 9672], [9675, 9675],
    [9678, 9681], [9698, 9701], [9711, 9711], [9733, 9734], [9737, 9737], [9742, 9743], [9748, 9749], [9756, 9756], [9758, 9758], [9792, 9792], [9794, 9794], [9824, 9825], [9827, 9829], [9831, 9834], [9836, 9837], [9839, 9839], [10045, 10045], [10102, 10111], [57344, 63743], [65533, 65533], [983040, 1048573], [1048576, 1114109]];
lib.wc.isSpace = function (ucs) {
    var min = 0, max = lib.wc.combining.length - 1;
    var mid;
    if (ucs < lib.wc.combining[0][0] || ucs > lib.wc.combining[max][1])return false;
    while (max >= min) {
        mid = Math.floor((min + max) / 2);
        if (ucs > lib.wc.combining[mid][1])min = mid + 1; else if (ucs < lib.wc.combining[mid][0])max = mid - 1; else return true
    }
    return false
};
lib.wc.isCjkAmbiguous = function (ucs) {
    var min = 0, max = lib.wc.ambiguous.length - 1;
    var mid;
    if (ucs < lib.wc.ambiguous[0][0] || ucs > lib.wc.ambiguous[max][1])return false;
    while (max >= min) {
        mid = Math.floor((min + max) / 2);
        if (ucs > lib.wc.ambiguous[mid][1])min = mid + 1; else if (ucs < lib.wc.ambiguous[mid][0])max = mid - 1; else return true
    }
    return false
};
lib.wc.charWidth = function (ucs) {
    if (lib.wc.regardCjkAmbiguous)return lib.wc.charWidthRegardAmbiguous(ucs); else return lib.wc.charWidthDisregardAmbiguous(ucs)
};
lib.wc.charWidthDisregardAmbiguous = function (ucs) {
    if (ucs === 0)return lib.wc.nulWidth;
    if (ucs < 32 || ucs >= 127 && ucs < 160)return lib.wc.controlWidth;
    if (ucs < 127)return 1;
    if (lib.wc.isSpace(ucs))return 0;
    return 1 + (ucs >= 4352 && (ucs <= 4447 || ucs == 9001 || ucs == 9002 || ucs >= 11904 && ucs <= 42191 && ucs != 12351 || ucs >= 44032 && ucs <= 55203 || ucs >= 63744 && ucs <= 64255 || ucs >= 65040 && ucs <= 65049 || ucs >= 65072 && ucs <= 65135 || ucs >= 65280 && ucs <= 65376 || ucs >= 65504 && ucs <= 65510 || ucs >= 131072 && ucs <= 196605 || ucs >= 196608 && ucs <= 262141))
};
lib.wc.charWidthRegardAmbiguous = function (ucs) {
    if (lib.wc.isCjkAmbiguous(ucs))return lib.wc.cjkAmbiguousWidth;
    return lib.wc.charWidthDisregardAmbiguous(ucs)
};
lib.wc.strWidth = function (str) {
    var width, rv = 0;
    for (var i = 0; i < str.length;) {
        var codePoint = str.codePointAt(i);
        width = lib.wc.charWidth(codePoint);
        if (width < 0)return -1;
        rv += width;
        i += codePoint <= 65535 ? 1 : 2
    }
    return rv
};
lib.wc.substr = function (str, start, opt_width) {
    var startIndex, endIndex, width;
    for (startIndex = 0, width = 0; startIndex < str.length; startIndex++) {
        width += lib.wc.charWidth(str.charCodeAt(startIndex));
        if (width > start)break
    }
    if (opt_width != undefined) {
        for (endIndex = startIndex, width = 0; endIndex < str.length && width < opt_width; width += lib.wc.charWidth(str.charCodeAt(endIndex)), endIndex++);
        if (width > opt_width)endIndex--;
        return str.substring(startIndex, endIndex)
    }
    return str.substr(startIndex)
};
lib.wc.substring = function (str, start, end) {
    return lib.wc.substr(str, start, end - start)
};
lib.resource.add("libdot/changelog/version", "text/plain", "1.9" + "");
lib.resource.add("libdot/changelog/date", "text/plain", "2014-05-27" + "");
"use strict";
lib.rtdep("lib.Storage");
var hterm = {};
hterm.windowType = null;
hterm.zoomWarningMessage = "ZOOM != 100%";
hterm.notifyCopyMessage = "\u2702";
hterm.desktopNotificationTitle = "\u266a %(title) \u266a";
hterm.testDeps = ["hterm.ScrollPort.Tests", "hterm.Screen.Tests", "hterm.Terminal.Tests", "hterm.VT.Tests", "hterm.VT.CannedTests"];
lib.registerInit("hterm", function (onInit) {
    function onWindow(window) {
        hterm.windowType = window.type;
        setTimeout(onInit, 0)
    }

    function onTab(tab) {
        if (tab && window.chrome)chrome.windows.get(tab.windowId, null, onWindow); else {
            hterm.windowType = "normal";
            setTimeout(onInit, 0)
        }
    }

    if (!hterm.defaultStorage) {
        var ary = navigator.userAgent.match(/\sChrome\/(\d\d)/);
        var version = ary ? parseInt(ary[1]) : -1;
        if (window.chrome && chrome.storage && chrome.storage.sync && version > 21)hterm.defaultStorage = new lib.Storage.Chrome(chrome.storage.sync);
        else hterm.defaultStorage = new lib.Storage.Local
    }
    var isPackagedApp = false;
    if (window.chrome && chrome.runtime && chrome.runtime.getManifest) {
        var manifest = chrome.runtime.getManifest();
        var isPackagedApp = manifest.app && manifest.app.background
    }
    if (isPackagedApp)setTimeout(onWindow.bind(null, {type: "popup"}), 0); else if (window.chrome && chrome.tabs)chrome.tabs.getCurrent(onTab); else setTimeout(onWindow.bind(null, {type: "normal"}), 0)
});
hterm.getClientSize = function (dom) {
    return dom.getBoundingClientRect()
};
hterm.getClientWidth = function (dom) {
    return dom.getBoundingClientRect().width
};
hterm.getClientHeight = function (dom) {
    return dom.getBoundingClientRect().height
};
hterm.copySelectionToClipboard = function (document) {
    try {
        document.execCommand("copy")
    } catch (firefoxException) {
    }
};
hterm.pasteFromClipboard = function (document) {
    try {
        document.execCommand("paste")
    } catch (firefoxException) {
    }
};
hterm.Size = function (width, height) {
    this.width = width;
    this.height = height
};
hterm.Size.prototype.resize = function (width, height) {
    this.width = width;
    this.height = height
};
hterm.Size.prototype.clone = function () {
    return new hterm.Size(this.width, this.height)
};
hterm.Size.prototype.setTo = function (that) {
    this.width = that.width;
    this.height = that.height
};
hterm.Size.prototype.equals = function (that) {
    return this.width == that.width && this.height == that.height
};
hterm.Size.prototype.toString = function () {
    return "[hterm.Size: " + this.width + ", " + this.height + "]"
};
hterm.RowCol = function (row, column, opt_overflow) {
    this.row = row;
    this.column = column;
    this.overflow = !!opt_overflow
};
hterm.RowCol.prototype.move = function (row, column, opt_overflow) {
    this.row = row;
    this.column = column;
    this.overflow = !!opt_overflow
};
hterm.RowCol.prototype.clone = function () {
    return new hterm.RowCol(this.row, this.column, this.overflow)
};
hterm.RowCol.prototype.setTo = function (that) {
    this.row = that.row;
    this.column = that.column;
    this.overflow = that.overflow
};
hterm.RowCol.prototype.equals = function (that) {
    return this.row == that.row && this.column == that.column && this.overflow == that.overflow
};
hterm.RowCol.prototype.toString = function () {
    return "[hterm.RowCol: " + this.row + ", " + this.column + ", " + this.overflow + "]"
};
"use strict";
lib.rtdep("lib.f");
hterm.Frame = function (terminal, url, opt_options) {
    this.terminal_ = terminal;
    this.div_ = terminal.div_;
    this.url = url;
    this.options = opt_options || {};
    this.iframe_ = null;
    this.container_ = null;
    this.messageChannel_ = null
};
hterm.Frame.prototype.onMessage_ = function (e) {
    if (e.data.name != "ipc-init-ok") {
        console.log("Unknown message from frame:", e.data);
        return
    }
    this.sendTerminalInfo_();
    this.messageChannel_.port1.onmessage = this.onMessage.bind(this);
    this.onLoad()
};
hterm.Frame.prototype.onMessage = function () {
};
hterm.Frame.prototype.onLoad_ = function () {
    this.messageChannel_ = new MessageChannel;
    this.messageChannel_.port1.onmessage = this.onMessage_.bind(this);
    this.messageChannel_.port1.start();
    this.iframe_.contentWindow.postMessage({
        name: "ipc-init",
        argv: [{messagePort: this.messageChannel_.port2}]
    }, [this.messageChannel_.port2], this.url)
};
hterm.Frame.prototype.onLoad = function () {
};
hterm.Frame.prototype.sendTerminalInfo_ = function () {
    lib.f.getAcceptLanguages(function (languages) {
        this.postMessage("terminal-info", [{
            acceptLanguages: languages,
            foregroundColor: this.terminal_.getForegroundColor(),
            backgroundColor: this.terminal_.getBackgroundColor(),
            cursorColor: this.terminal_.getCursorColor(),
            fontSize: this.terminal_.getFontSize(),
            fontFamily: this.terminal_.getFontFamily(),
            baseURL: lib.f.getURL("/")
        }])
    }.bind(this))
};
hterm.Frame.prototype.onCloseClicked_ = function () {
    this.close()
};
hterm.Frame.prototype.close = function () {
    if (!this.container_ || !this.container_.parentNode)return;
    this.container_.parentNode.removeChild(this.container_);
    this.onClose()
};
hterm.Frame.prototype.onClose = function () {
};
hterm.Frame.prototype.postMessage = function (name, argv) {
    if (!this.messageChannel_)throw new Error("Message channel is not set up.");
    this.messageChannel_.port1.postMessage({name: name, argv: argv})
};
hterm.Frame.prototype.show = function () {
    var self = this;

    function opt(name, defaultValue) {
        if (name in self.options)return self.options[name];
        return defaultValue
    }

    var self = this;
    if (this.container_ && this.container_.parentNode) {
        console.error("Frame already visible");
        return
    }
    var headerHeight = "16px";
    var divSize = hterm.getClientSize(this.div_);
    var width = opt("width", 640);
    var height = opt("height", 480);
    var left = (divSize.width - width) / 2;
    var top = (divSize.height - height) / 2;
    var document = this.terminal_.document_;
    var container =
        this.container_ = document.createElement("div");
    container.style.cssText = "position: absolute;" + "display: -webkit-flex;" + "-webkit-flex-direction: column;" + "top: 10%;" + "left: 4%;" + "width: 90%;" + "height: 80%;" + "box-shadow: 0 0 2px " + this.terminal_.getForegroundColor() + ";" + "border: 2px " + this.terminal_.getForegroundColor() + " solid;";
    var header = document.createElement("div");
    header.style.cssText = "display: -webkit-flex;" + "-webkit-justify-content: flex-end;" + "height: " + headerHeight + ";" + "background-color: " +
        this.terminal_.getForegroundColor() + ";" + "color: " + this.terminal_.getBackgroundColor() + ";" + "font-size: 16px;" + "font-family: " + this.terminal_.getFontFamily();
    container.appendChild(header);
    if (false) {
        var button = document.createElement("div");
        button.setAttribute("role", "button");
        button.style.cssText = "margin-top: -3px;" + "margin-right: 3px;" + "cursor: pointer;";
        button.textContent = "\u2a2f";
        button.addEventListener("click", this.onCloseClicked_.bind(this));
        header.appendChild(button)
    }
    var iframe = this.iframe_ = document.createElement("iframe");
    iframe.onload = this.onLoad_.bind(this);
    iframe.style.cssText = "display: -webkit-flex;" + "-webkit-flex: 1;" + "width: 100%";
    iframe.setAttribute("src", this.url);
    iframe.setAttribute("seamless", true);
    container.appendChild(iframe);
    this.div_.appendChild(container)
};
"use strict";
lib.rtdep("hterm.Keyboard.KeyMap");
hterm.Keyboard = function (terminal) {
    this.terminal = terminal;
    this.keyboardElement_ = null;
    this.handlers_ = [["blur", this.onBlur_.bind(this)], ["keydown", this.onKeyDown_.bind(this)], ["keypress", this.onKeyPress_.bind(this)], ["keyup", this.onKeyUp_.bind(this)], ["textInput", this.onTextInput_.bind(this)]];
    this.keyMap = new hterm.Keyboard.KeyMap(this);
    this.bindings = new hterm.Keyboard.Bindings(this);
    this.altGrMode = "none";
    this.shiftInsertPaste = true;
    this.homeKeysScroll = false;
    this.pageKeysScroll = false;
    this.ctrlPlusMinusZeroZoom =
        true;
    this.ctrlCCopy = false;
    this.ctrlVPaste = false;
    this.applicationKeypad = false;
    this.applicationCursor = false;
    this.backspaceSendsBackspace = false;
    this.characterEncoding = "utf-8";
    this.metaSendsEscape = true;
    this.passMetaV = true;
    this.altSendsWhat = "escape";
    this.altIsMeta = false;
    this.altBackspaceIsMetaBackspace = false;
    this.altKeyPressed = 0;
    this.mediaKeysAreFKeys = false;
    this.previousAltSendsWhat_ = null
};
hterm.Keyboard.KeyActions = {
    CANCEL: new String("CANCEL"),
    DEFAULT: new String("DEFAULT"),
    PASS: new String("PASS"),
    STRIP: new String("STRIP")
};
hterm.Keyboard.prototype.encode = function (str) {
    if (this.characterEncoding == "utf-8")return this.terminal.vt.encodeUTF8(str);
    return str
};
hterm.Keyboard.prototype.installKeyboard = function (element) {
    if (element == this.keyboardElement_)return;
    if (element && this.keyboardElement_)this.installKeyboard(null);
    for (var i = 0; i < this.handlers_.length; i++) {
        var handler = this.handlers_[i];
        if (element)element.addEventListener(handler[0], handler[1]); else this.keyboardElement_.removeEventListener(handler[0], handler[1])
    }
    this.keyboardElement_ = element
};
hterm.Keyboard.prototype.uninstallKeyboard = function () {
    this.installKeyboard(null)
};
hterm.Keyboard.prototype.onTextInput_ = function (e) {
    if (!e.data)return;
    e.data.split("").forEach(this.terminal.onVTKeystroke.bind(this.terminal))
};
hterm.Keyboard.prototype.onKeyPress_ = function (e) {
    var code;
    var key = String.fromCharCode(e.which);
    var lowerKey = key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && (lowerKey == "c" || lowerKey == "v"))return;
    if (e.altKey && this.altSendsWhat == "browser-key" && e.charCode == 0) {
        var ch = String.fromCharCode(e.keyCode);
        if (!e.shiftKey)ch = ch.toLowerCase();
        code = ch.charCodeAt(0) + 128
    } else if (e.charCode >= 32)ch = e.charCode;
    if (ch)this.terminal.onVTKeystroke(String.fromCharCode(ch));
    e.preventDefault();
    e.stopPropagation()
};
hterm.Keyboard.prototype.preventChromeAppNonCtrlShiftDefault_ = function (e) {
    if (!window.chrome || !window.chrome.app || !window.chrome.app.window)return;
    if (!e.ctrlKey || !e.shiftKey)e.preventDefault()
};
hterm.Keyboard.prototype.onBlur_ = function (e) {
    this.altKeyPressed = 0
};
hterm.Keyboard.prototype.onKeyUp_ = function (e) {
    if (e.keyCode == 18)this.altKeyPressed = this.altKeyPressed & ~(1 << e.location - 1);
    if (e.keyCode == 27)this.preventChromeAppNonCtrlShiftDefault_(e)
};
hterm.Keyboard.prototype.onKeyDown_ = function (e) {
    if (e.keyCode == 18)this.altKeyPressed = this.altKeyPressed | 1 << e.location - 1;
    if (e.keyCode == 27)this.preventChromeAppNonCtrlShiftDefault_(e);
    var keyDef = this.keyMap.keyDefs[e.keyCode];
    if (!keyDef) {
        console.warn("No definition for keyCode: " + e.keyCode);
        return
    }
    var resolvedActionType = null;
    var self = this;

    function getAction(name) {
        resolvedActionType = name;
        var action = keyDef[name];
        if (typeof action == "function")action = action.apply(self.keyMap, [e, keyDef]);
        if (action === DEFAULT &&
            name != "normal")action = getAction("normal");
        return action
    }

    var CANCEL = hterm.Keyboard.KeyActions.CANCEL;
    var DEFAULT = hterm.Keyboard.KeyActions.DEFAULT;
    var PASS = hterm.Keyboard.KeyActions.PASS;
    var STRIP = hterm.Keyboard.KeyActions.STRIP;
    var control = e.ctrlKey;
    var alt = this.altIsMeta ? false : e.altKey;
    var meta = this.altIsMeta ? e.altKey || e.metaKey : e.metaKey;
    var isPrintable = !/^\[\w+\]$/.test(keyDef.keyCap);
    switch (this.altGrMode) {
        case "ctrl-alt":
            if (isPrintable && control && alt) {
                control = false;
                alt = false
            }
            break;
        case "right-alt":
            if (isPrintable &&
                this.terminal.keyboard.altKeyPressed & 2) {
                control = false;
                alt = false
            }
            break;
        case "left-alt":
            if (isPrintable && this.terminal.keyboard.altKeyPressed & 1) {
                control = false;
                alt = false
            }
            break
    }
    var action;
    if (control)action = getAction("control"); else if (alt)action = getAction("alt"); else if (meta)action = getAction("meta"); else action = getAction("normal");
    var shift = !e.maskShiftKey && e.shiftKey;
    var keyDown = {keyCode: e.keyCode, shift: e.shiftKey, ctrl: control, alt: alt, meta: meta};
    var binding = this.bindings.getBinding(keyDown);
    if (binding) {
        shift =
            control = alt = meta = false;
        resolvedActionType = "normal";
        action = binding.action;
        if (typeof action == "function")action = action.call(this, this.terminal, keyDown)
    }
    if (alt && this.altSendsWhat == "browser-key" && action == DEFAULT)action = PASS;
    if (action === PASS || action === DEFAULT && !(control || alt || meta))return;
    if (action === STRIP) {
        alt = control = false;
        action = keyDef.normal;
        if (typeof action == "function")action = action.apply(this.keyMap, [e, keyDef]);
        if (action == DEFAULT && keyDef.keyCap.length == 2)action = keyDef.keyCap.substr(shift ? 1 : 0, 1)
    }
    e.preventDefault();
    e.stopPropagation();
    if (action === CANCEL)return;
    if (action !== DEFAULT && typeof action != "string") {
        console.warn("Invalid action: " + JSON.stringify(action));
        return
    }
    if (resolvedActionType == "control")control = false; else if (resolvedActionType == "alt")alt = false; else if (resolvedActionType == "meta")meta = false;
    if (action.substr(0, 2) == "\u001b[" && (alt || control || shift)) {
        var mod;
        if (shift && !(alt || control))mod = ";2"; else if (alt && !(shift || control))mod = ";3"; else if (shift && alt && !control)mod = ";4"; else if (control && !(shift || alt))mod =
            ";5"; else if (shift && control && !alt)mod = ";6"; else if (alt && control && !shift)mod = ";7"; else if (shift && alt && control)mod = ";8";
        if (action.length == 3)action = "\u001b[1" + mod + action.substr(2, 1); else action = action.substr(0, action.length - 1) + mod + action.substr(action.length - 1)
    } else {
        if (action === DEFAULT) {
            action = keyDef.keyCap.substr(shift ? 1 : 0, 1);
            if (control) {
                var unshifted = keyDef.keyCap.substr(0, 1);
                var code = unshifted.charCodeAt(0);
                if (code >= 64 && code <= 95)action = String.fromCharCode(code - 64)
            }
        }
        if (alt && this.altSendsWhat == "8-bit" &&
            action.length == 1) {
            var code = action.charCodeAt(0) + 128;
            action = String.fromCharCode(code)
        }
        if (alt && this.altSendsWhat == "escape" || meta && this.metaSendsEscape)action = "\u001b" + action
    }
    this.terminal.onVTKeystroke(action)
};
"use strict";
hterm.Keyboard.Bindings = function () {
    this.bindings_ = {}
};
hterm.Keyboard.Bindings.prototype.clear = function () {
    this.bindings_ = {}
};
hterm.Keyboard.Bindings.prototype.addBinding = function (keyPattern, action) {
    var binding = null;
    var list = this.bindings_[keyPattern.keyCode];
    if (list)for (var i = 0; i < list.length; i++)if (list[i].keyPattern.matchKeyPattern(keyPattern)) {
        binding = list[i];
        break
    }
    if (binding)binding.action = action; else {
        binding = {keyPattern: keyPattern, action: action};
        if (!list)this.bindings_[keyPattern.keyCode] = [binding]; else {
            this.bindings_[keyPattern.keyCode].push(binding);
            list.sort(function (a, b) {
                return hterm.Keyboard.KeyPattern.sortCompare(a.keyPattern,
                    b.keyPattern)
            })
        }
    }
};
hterm.Keyboard.Bindings.prototype.addBindings = function (map) {
    var p = new hterm.Parser;
    for (var key in map) {
        p.reset(key);
        var sequence;
        try {
            sequence = p.parseKeySequence()
        } catch (ex) {
            console.error(ex);
            continue
        }
        if (!p.isComplete()) {
            console.error(p.error("Expected end of sequence: " + sequence));
            continue
        }
        p.reset(map[key]);
        var action;
        try {
            action = p.parseKeyAction()
        } catch (ex$2) {
            console.error(ex$2);
            continue
        }
        if (!p.isComplete()) {
            console.error(p.error("Expected end of sequence: " + sequence));
            continue
        }
        this.addBinding(new hterm.Keyboard.KeyPattern(sequence), action)
    }
};
hterm.Keyboard.Bindings.prototype.getBinding = function (keyDown) {
    var list = this.bindings_[keyDown.keyCode];
    if (!list)return null;
    for (var i = 0; i < list.length; i++) {
        var binding = list[i];
        if (binding.keyPattern.matchKeyDown(keyDown))return binding
    }
    return null
};
"use strict";
lib.rtdep("hterm.Keyboard.KeyActions");
hterm.Keyboard.KeyMap = function (keyboard) {
    this.keyboard = keyboard;
    this.keyDefs = {};
    this.reset()
};
hterm.Keyboard.KeyMap.prototype.addKeyDef = function (keyCode, def) {
    if (keyCode in this.keyDefs)console.warn("Duplicate keyCode: " + keyCode);
    this.keyDefs[keyCode] = def
};
hterm.Keyboard.KeyMap.prototype.addKeyDefs = function (var_args) {
    for (var i = 0; i < arguments.length; i++)this.addKeyDef(arguments[i][0], {
        keyCap: arguments[i][1],
        normal: arguments[i][2],
        control: arguments[i][3],
        alt: arguments[i][4],
        meta: arguments[i][5]
    })
};
hterm.Keyboard.KeyMap.prototype.reset = function () {
    this.keyDefs = {};
    var self = this;

    function resolve(action, e, k) {
        if (typeof action == "function")return action.apply(self, [e, k]);
        return action
    }

    function ak(a, b) {
        return function (e, k) {
            var action = e.shiftKey || e.ctrlKey || e.altKey || e.metaKey || !self.keyboard.applicationKeypad ? a : b;
            return resolve(action, e, k)
        }
    }

    function ac(a, b) {
        return function (e, k) {
            var action = e.shiftKey || e.ctrlKey || e.altKey || e.metaKey || !self.keyboard.applicationCursor ? a : b;
            return resolve(action, e, k)
        }
    }

    function bs(a,
                b) {
        return function (e, k) {
            var action = !self.keyboard.backspaceSendsBackspace ? a : b;
            return resolve(action, e, k)
        }
    }

    function sh(a, b) {
        return function (e, k) {
            var action = !e.shiftKey ? a : b;
            e.maskShiftKey = true;
            return resolve(action, e, k)
        }
    }

    function alt(a, b) {
        return function (e, k) {
            var action = !e.altKey ? a : b;
            return resolve(action, e, k)
        }
    }

    function mod(a, b) {
        return function (e, k) {
            var action = !(e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) ? a : b;
            return resolve(action, e, k)
        }
    }

    function ctl(ch) {
        return String.fromCharCode(ch.charCodeAt(0) - 64)
    }

    function c(m) {
        return function (e, k) {
            return this[m](e, k)
        }
    }

    function med(fn) {
        return function (e, k) {
            if (!self.keyboard.mediaKeysAreFKeys)return e.keyCode == 166 || e.keyCode == 167 || e.keyCode == 168 ? hterm.Keyboard.KeyActions.CANCEL : hterm.Keyboard.KeyActions.PASS;
            return resolve(fn, e, k)
        }
    }

    var ESC = "\u001b";
    var CSI = "\u001b[";
    var SS3 = "\u001bO";
    var CANCEL = hterm.Keyboard.KeyActions.CANCEL;
    var DEFAULT = hterm.Keyboard.KeyActions.DEFAULT;
    var PASS = hterm.Keyboard.KeyActions.PASS;
    var STRIP = hterm.Keyboard.KeyActions.STRIP;
    this.addKeyDefs([0,
            "[UNKNOWN]", PASS, PASS, PASS, PASS], [27, "[ESC]", ESC, DEFAULT, DEFAULT, DEFAULT], [112, "[F1]", mod(SS3 + "P", CSI + "P"), DEFAULT, CSI + "23~", DEFAULT], [113, "[F2]", mod(SS3 + "Q", CSI + "Q"), DEFAULT, CSI + "24~", DEFAULT], [114, "[F3]", mod(SS3 + "R", CSI + "R"), DEFAULT, CSI + "25~", DEFAULT], [115, "[F4]", mod(SS3 + "S", CSI + "S"), DEFAULT, CSI + "26~", DEFAULT], [116, "[F5]", CSI + "15~", DEFAULT, CSI + "28~", DEFAULT], [117, "[F6]", CSI + "17~", DEFAULT, CSI + "29~", DEFAULT], [118, "[F7]", CSI + "18~", DEFAULT, CSI + "31~", DEFAULT], [119, "[F8]", CSI + "19~", DEFAULT, CSI + "32~",
            DEFAULT], [120, "[F9]", CSI + "20~", DEFAULT, CSI + "33~", DEFAULT], [121, "[F10]", CSI + "21~", DEFAULT, CSI + "34~", DEFAULT], [122, "[F11]", CSI + "23~", DEFAULT, CSI + "42~", DEFAULT], [123, "[F12]", CSI + "24~", DEFAULT, CSI + "43~", DEFAULT], [192, "`~", DEFAULT, sh(ctl("@"), ctl("^")), DEFAULT, PASS], [49, "1!", DEFAULT, c("onCtrlNum_"), c("onAltNum_"), c("onMetaNum_")], [50, "2@", DEFAULT, c("onCtrlNum_"), c("onAltNum_"), c("onMetaNum_")], [51, "3#", DEFAULT, c("onCtrlNum_"), c("onAltNum_"), c("onMetaNum_")], [52, "4$", DEFAULT, c("onCtrlNum_"), c("onAltNum_"),
            c("onMetaNum_")], [53, "5%", DEFAULT, c("onCtrlNum_"), c("onAltNum_"), c("onMetaNum_")], [54, "6^", DEFAULT, c("onCtrlNum_"), c("onAltNum_"), c("onMetaNum_")], [55, "7&", DEFAULT, c("onCtrlNum_"), c("onAltNum_"), c("onMetaNum_")], [56, "8*", DEFAULT, c("onCtrlNum_"), c("onAltNum_"), c("onMetaNum_")], [57, "9(", DEFAULT, c("onCtrlNum_"), c("onAltNum_"), c("onMetaNum_")], [48, "0)", DEFAULT, c("onPlusMinusZero_"), c("onAltNum_"), c("onPlusMinusZero_")], [189, "-_", DEFAULT, c("onPlusMinusZero_"), DEFAULT, c("onPlusMinusZero_")], [187, "=+", DEFAULT,
            c("onPlusMinusZero_"), DEFAULT, c("onPlusMinusZero_")], [173, "-_", DEFAULT, c("onPlusMinusZero_"), DEFAULT, c("onPlusMinusZero_")], [61, "=+", DEFAULT, c("onPlusMinusZero_"), DEFAULT, c("onPlusMinusZero_")], [171, "+*", DEFAULT, c("onPlusMinusZero_"), DEFAULT, c("onPlusMinusZero_")], [8, "[BKSP]", bs("\u007f", "\b"), bs("\b", "\u007f"), DEFAULT, DEFAULT], [9, "[TAB]", sh("\t", CSI + "Z"), STRIP, PASS, DEFAULT], [81, "qQ", DEFAULT, ctl("Q"), DEFAULT, DEFAULT], [87, "wW", DEFAULT, ctl("W"), DEFAULT, DEFAULT], [69, "eE", DEFAULT, ctl("E"), DEFAULT, DEFAULT],
        [82, "rR", DEFAULT, ctl("R"), DEFAULT, DEFAULT], [84, "tT", DEFAULT, ctl("T"), DEFAULT, DEFAULT], [89, "yY", DEFAULT, ctl("Y"), DEFAULT, DEFAULT], [85, "uU", DEFAULT, ctl("U"), DEFAULT, DEFAULT], [73, "iI", DEFAULT, ctl("I"), DEFAULT, DEFAULT], [79, "oO", DEFAULT, ctl("O"), DEFAULT, DEFAULT], [80, "pP", DEFAULT, ctl("P"), DEFAULT, DEFAULT], [219, "[{", DEFAULT, ctl("["), DEFAULT, DEFAULT], [221, "]}", DEFAULT, ctl("]"), DEFAULT, DEFAULT], [220, "\\|", DEFAULT, ctl("\\"), DEFAULT, DEFAULT], [20, "[CAPS]", PASS, PASS, PASS, DEFAULT], [65, "aA", DEFAULT, ctl("A"), DEFAULT,
            DEFAULT], [83, "sS", DEFAULT, ctl("S"), DEFAULT, DEFAULT], [68, "dD", DEFAULT, ctl("D"), DEFAULT, DEFAULT], [70, "fF", DEFAULT, ctl("F"), DEFAULT, DEFAULT], [71, "gG", DEFAULT, ctl("G"), DEFAULT, DEFAULT], [72, "hH", DEFAULT, ctl("H"), DEFAULT, DEFAULT], [74, "jJ", DEFAULT, sh(ctl("J"), PASS), DEFAULT, DEFAULT], [75, "kK", DEFAULT, sh(ctl("K"), c("onClear_")), DEFAULT, DEFAULT], [76, "lL", DEFAULT, sh(ctl("L"), PASS), DEFAULT, DEFAULT], [186, ";:", DEFAULT, STRIP, DEFAULT, DEFAULT], [222, "'\"", DEFAULT, STRIP, DEFAULT, DEFAULT], [13, "[ENTER]", "\r", CANCEL, CANCEL,
            DEFAULT], [16, "[SHIFT]", PASS, PASS, PASS, DEFAULT], [90, "zZ", DEFAULT, ctl("Z"), DEFAULT, DEFAULT], [88, "xX", DEFAULT, ctl("X"), DEFAULT, DEFAULT], [67, "cC", DEFAULT, c("onCtrlC_"), DEFAULT, c("onMetaC_")], [86, "vV", DEFAULT, c("onCtrlV_"), DEFAULT, c("onMetaV_")], [66, "bB", DEFAULT, sh(ctl("B"), PASS), DEFAULT, sh(DEFAULT, PASS)], [78, "nN", DEFAULT, c("onCtrlN_"), DEFAULT, c("onMetaN_")], [77, "mM", DEFAULT, ctl("M"), DEFAULT, DEFAULT], [188, ",<", DEFAULT, alt(STRIP, PASS), DEFAULT, DEFAULT], [190, ".>", DEFAULT, alt(STRIP, PASS), DEFAULT, DEFAULT],
        [191, "/?", DEFAULT, sh(ctl("_"), ctl("?")), DEFAULT, DEFAULT], [17, "[CTRL]", PASS, PASS, PASS, PASS], [18, "[ALT]", PASS, PASS, PASS, PASS], [91, "[LAPL]", PASS, PASS, PASS, PASS], [32, " ", DEFAULT, ctl("@"), DEFAULT, DEFAULT], [92, "[RAPL]", PASS, PASS, PASS, PASS], [93, "[RMENU]", PASS, PASS, PASS, PASS], [42, "[PRTSCR]", PASS, PASS, PASS, PASS], [145, "[SCRLK]", PASS, PASS, PASS, PASS], [19, "[BREAK]", PASS, PASS, PASS, PASS], [45, "[INSERT]", c("onKeyInsert_"), DEFAULT, DEFAULT, DEFAULT], [36, "[HOME]", c("onKeyHome_"), DEFAULT, DEFAULT, DEFAULT], [33, "[PGUP]",
            c("onKeyPageUp_"), DEFAULT, DEFAULT, DEFAULT], [46, "[DEL]", c("onKeyDel_"), DEFAULT, DEFAULT, DEFAULT], [35, "[END]", c("onKeyEnd_"), DEFAULT, DEFAULT, DEFAULT], [34, "[PGDOWN]", c("onKeyPageDown_"), DEFAULT, DEFAULT, DEFAULT], [38, "[UP]", ac(CSI + "A", SS3 + "A"), DEFAULT, DEFAULT, DEFAULT], [40, "[DOWN]", ac(CSI + "B", SS3 + "B"), DEFAULT, DEFAULT, DEFAULT], [39, "[RIGHT]", ac(CSI + "C", SS3 + "C"), DEFAULT, DEFAULT, DEFAULT], [37, "[LEFT]", ac(CSI + "D", SS3 + "D"), DEFAULT, DEFAULT, DEFAULT], [144, "[NUMLOCK]", PASS, PASS, PASS, PASS], [96, "[KP0]", DEFAULT, DEFAULT,
            DEFAULT, DEFAULT], [97, "[KP1]", DEFAULT, DEFAULT, DEFAULT, DEFAULT], [98, "[KP2]", DEFAULT, DEFAULT, DEFAULT, DEFAULT], [99, "[KP3]", DEFAULT, DEFAULT, DEFAULT, DEFAULT], [100, "[KP4]", DEFAULT, DEFAULT, DEFAULT, DEFAULT], [101, "[KP5]", DEFAULT, DEFAULT, DEFAULT, DEFAULT], [102, "[KP6]", DEFAULT, DEFAULT, DEFAULT, DEFAULT], [103, "[KP7]", DEFAULT, DEFAULT, DEFAULT, DEFAULT], [104, "[KP8]", DEFAULT, DEFAULT, DEFAULT, DEFAULT], [105, "[KP9]", DEFAULT, DEFAULT, DEFAULT, DEFAULT], [107, "[KP+]", DEFAULT, c("onPlusMinusZero_"), DEFAULT, c("onPlusMinusZero_")],
        [109, "[KP-]", DEFAULT, c("onPlusMinusZero_"), DEFAULT, c("onPlusMinusZero_")], [106, "[KP*]", DEFAULT, DEFAULT, DEFAULT, DEFAULT], [111, "[KP/]", DEFAULT, DEFAULT, DEFAULT, DEFAULT], [110, "[KP.]", DEFAULT, DEFAULT, DEFAULT, DEFAULT], [166, "[BACK]", med(mod(SS3 + "P", CSI + "P")), DEFAULT, CSI + "23~", DEFAULT], [167, "[FWD]", med(mod(SS3 + "Q", CSI + "Q")), DEFAULT, CSI + "24~", DEFAULT], [168, "[RELOAD]", med(mod(SS3 + "R", CSI + "R")), DEFAULT, CSI + "25~", DEFAULT], [183, "[FSCR]", med(mod(SS3 + "S", CSI + "S")), DEFAULT, CSI + "26~", DEFAULT], [182, "[WINS]", med(CSI +
            "15~"), DEFAULT, CSI + "28~", DEFAULT], [216, "[BRIT-]", med(CSI + "17~"), DEFAULT, CSI + "29~", DEFAULT], [217, "[BRIT+]", med(CSI + "18~"), DEFAULT, CSI + "31~", DEFAULT])
};
hterm.Keyboard.KeyMap.prototype.onKeyInsert_ = function (e) {
    if (this.keyboard.shiftInsertPaste && e.shiftKey)return hterm.Keyboard.KeyActions.PASS;
    return "\u001b[2~"
};
hterm.Keyboard.KeyMap.prototype.onKeyHome_ = function (e) {
    if (!this.keyboard.homeKeysScroll ^ e.shiftKey) {
        if (e.altey || e.ctrlKey || e.shiftKey || !this.keyboard.applicationCursor)return "\u001b[H";
        return "\u001bOH"
    }
    this.keyboard.terminal.scrollHome();
    return hterm.Keyboard.KeyActions.CANCEL
};
hterm.Keyboard.KeyMap.prototype.onKeyEnd_ = function (e) {
    if (!this.keyboard.homeKeysScroll ^ e.shiftKey) {
        if (e.altKey || e.ctrlKey || e.shiftKey || !this.keyboard.applicationCursor)return "\u001b[F";
        return "\u001bOF"
    }
    this.keyboard.terminal.scrollEnd();
    return hterm.Keyboard.KeyActions.CANCEL
};
hterm.Keyboard.KeyMap.prototype.onKeyPageUp_ = function (e) {
    if (!this.keyboard.pageKeysScroll ^ e.shiftKey)return "\u001b[5~";
    this.keyboard.terminal.scrollPageUp();
    return hterm.Keyboard.KeyActions.CANCEL
};
hterm.Keyboard.KeyMap.prototype.onKeyDel_ = function (e) {
    if (this.keyboard.altBackspaceIsMetaBackspace && this.keyboard.altKeyPressed && !e.altKey)return "\u001b\u007f";
    return "\u001b[3~"
};
hterm.Keyboard.KeyMap.prototype.onKeyPageDown_ = function (e) {
    if (!this.keyboard.pageKeysScroll ^ e.shiftKey)return "\u001b[6~";
    this.keyboard.terminal.scrollPageDown();
    return hterm.Keyboard.KeyActions.CANCEL
};
hterm.Keyboard.KeyMap.prototype.onClear_ = function (e, keyDef) {
    this.keyboard.terminal.wipeContents();
    return hterm.Keyboard.KeyActions.CANCEL
};
hterm.Keyboard.KeyMap.prototype.onCtrlNum_ = function (e, keyDef) {
    function ctl(ch) {
        return String.fromCharCode(ch.charCodeAt(0) - 64)
    }

    if (this.keyboard.terminal.passCtrlNumber && !e.shiftKey)return hterm.Keyboard.KeyActions.PASS;
    switch (keyDef.keyCap.substr(0, 1)) {
        case "1":
            return "1";
        case "2":
            return ctl("@");
        case "3":
            return ctl("[");
        case "4":
            return ctl("\\");
        case "5":
            return ctl("]");
        case "6":
            return ctl("^");
        case "7":
            return ctl("_");
        case "8":
            return "\u007f";
        case "9":
            return "9"
    }
};
hterm.Keyboard.KeyMap.prototype.onAltNum_ = function (e, keyDef) {
    if (this.keyboard.terminal.passAltNumber && !e.shiftKey)return hterm.Keyboard.KeyActions.PASS;
    return hterm.Keyboard.KeyActions.DEFAULT
};
hterm.Keyboard.KeyMap.prototype.onMetaNum_ = function (e, keyDef) {
    if (this.keyboard.terminal.passMetaNumber && !e.shiftKey)return hterm.Keyboard.KeyActions.PASS;
    return hterm.Keyboard.KeyActions.DEFAULT
};
hterm.Keyboard.KeyMap.prototype.onCtrlC_ = function (e, keyDef) {
    var selection = this.keyboard.terminal.getDocument().getSelection();
    if (!selection.isCollapsed) {
        if (this.keyboard.ctrlCCopy && !e.shiftKey) {
            if (this.keyboard.terminal.clearSelectionAfterCopy)setTimeout(selection.collapseToEnd.bind(selection), 50);
            return hterm.Keyboard.KeyActions.PASS
        }
        if (!this.keyboard.ctrlCCopy && e.shiftKey) {
            if (this.keyboard.terminal.clearSelectionAfterCopy)setTimeout(selection.collapseToEnd.bind(selection), 50);
            this.keyboard.terminal.copySelectionToClipboard();
            return hterm.Keyboard.KeyActions.CANCEL
        }
    }
    return "\u0003"
};
hterm.Keyboard.KeyMap.prototype.onCtrlN_ = function (e, keyDef) {
    if (e.shiftKey) {
        window.open(document.location.href, "", "chrome=no,close=yes,resize=yes,scrollbars=yes," + "minimizable=yes,width=" + window.innerWidth + ",height=" + window.innerHeight);
        return hterm.Keyboard.KeyActions.CANCEL
    }
    return "\u000e"
};
hterm.Keyboard.KeyMap.prototype.onCtrlV_ = function (e, keyDef) {
    if (!e.shiftKey && this.keyboard.ctrlVPaste || e.shiftKey && !this.keyboard.ctrlVPaste)return hterm.Keyboard.KeyActions.PASS;
    return "\u0016"
};
hterm.Keyboard.KeyMap.prototype.onMetaN_ = function (e, keyDef) {
    if (e.shiftKey) {
        window.open(document.location.href, "", "chrome=no,close=yes,resize=yes,scrollbars=yes," + "minimizable=yes,width=" + window.outerWidth + ",height=" + window.outerHeight);
        return hterm.Keyboard.KeyActions.CANCEL
    }
    return hterm.Keyboard.KeyActions.DEFAULT
};
hterm.Keyboard.KeyMap.prototype.onMetaC_ = function (e, keyDef) {
    var document = this.keyboard.terminal.getDocument();
    if (e.shiftKey || document.getSelection().isCollapsed)return keyDef.keyCap.substr(e.shiftKey ? 1 : 0, 1);
    if (this.keyboard.terminal.clearSelectionAfterCopy)setTimeout(function () {
        document.getSelection().collapseToEnd()
    }, 50);
    return hterm.Keyboard.KeyActions.PASS
};
hterm.Keyboard.KeyMap.prototype.onMetaV_ = function (e, keyDef) {
    if (e.shiftKey)return hterm.Keyboard.KeyActions.PASS;
    return this.keyboard.passMetaV ? hterm.Keyboard.KeyActions.PASS : hterm.Keyboard.KeyActions.DEFAULT
};
hterm.Keyboard.KeyMap.prototype.onPlusMinusZero_ = function (e, keyDef) {
    if (!(this.keyboard.ctrlPlusMinusZeroZoom ^ e.shiftKey)) {
        if (keyDef.keyCap == "-_")return "\u001f";
        return hterm.Keyboard.KeyActions.CANCEL
    }
    if (this.keyboard.terminal.getZoomFactor() != 1)return hterm.Keyboard.KeyActions.PASS;
    var cap = keyDef.keyCap.substr(0, 1);
    if (cap == "0")this.keyboard.terminal.setFontSize(0); else {
        var size = this.keyboard.terminal.getFontSize();
        if (cap == "-" || keyDef.keyCap == "[KP-]")size -= 1; else size += 1;
        this.keyboard.terminal.setFontSize(size)
    }
    return hterm.Keyboard.KeyActions.CANCEL
};
"use strict";
hterm.Keyboard.KeyPattern = function (spec) {
    this.wildcardCount = 0;
    this.keyCode = spec.keyCode;
    hterm.Keyboard.KeyPattern.modifiers.forEach(function (mod) {
        this[mod] = spec[mod] || false;
        if (this[mod] == "*")this.wildcardCount++
    }.bind(this))
};
hterm.Keyboard.KeyPattern.modifiers = ["shift", "ctrl", "alt", "meta"];
hterm.Keyboard.KeyPattern.sortCompare = function (a, b) {
    if (a.wildcardCount < b.wildcardCount)return -1;
    if (a.wildcardCount > b.wildcardCount)return 1;
    return 0
};
hterm.Keyboard.KeyPattern.prototype.match_ = function (obj, exactMatch) {
    if (this.keyCode != obj.keyCode)return false;
    var rv = true;
    hterm.Keyboard.KeyPattern.modifiers.forEach(function (mod) {
        var modValue = mod in obj ? obj[mod] : false;
        if (!rv || !exactMatch && this[mod] == "*" || this[mod] == modValue)return;
        rv = false
    }.bind(this));
    return rv
};
hterm.Keyboard.KeyPattern.prototype.matchKeyDown = function (keyDown) {
    return this.match_(keyDown, false)
};
hterm.Keyboard.KeyPattern.prototype.matchKeyPattern = function (keyPattern) {
    return this.match_(keyPattern, true)
};
"use strict";
hterm.Options = function (opt_copy) {
    this.wraparound = opt_copy ? opt_copy.wraparound : true;
    this.reverseWraparound = opt_copy ? opt_copy.reverseWraparound : false;
    this.originMode = opt_copy ? opt_copy.originMode : false;
    this.autoCarriageReturn = opt_copy ? opt_copy.autoCarriageReturn : false;
    this.cursorVisible = opt_copy ? opt_copy.cursorVisible : false;
    this.cursorBlink = opt_copy ? opt_copy.cursorBlink : false;
    this.insertMode = opt_copy ? opt_copy.insertMode : false;
    this.reverseVideo = opt_copy ? opt_copy.reverseVideo : false;
    this.bracketedPaste =
        opt_copy ? opt_copy.bracketedPaste : false
};
"use strict";
lib.rtdep("hterm.Keyboard.KeyActions");
hterm.Parser = function () {
    this.source = "";
    this.pos = 0;
    this.ch = null
};
hterm.Parser.prototype.error = function (message) {
    return new Error("Parse error at " + this.pos + ": " + message)
};
hterm.Parser.prototype.isComplete = function () {
    return this.pos == this.source.length
};
hterm.Parser.prototype.reset = function (source, opt_pos) {
    this.source = source;
    this.pos = opt_pos || 0;
    this.ch = source.substr(0, 1)
};
hterm.Parser.prototype.parseKeySequence = function () {
    var rv = {keyCode: null};
    for (var k in hterm.Parser.identifiers.modifierKeys)rv[hterm.Parser.identifiers.modifierKeys[k]] = false;
    while (this.pos < this.source.length) {
        this.skipSpace();
        var token = this.parseToken();
        if (token.type == "integer")rv.keyCode = token.value; else if (token.type == "identifier")if (token.value in hterm.Parser.identifiers.modifierKeys) {
            var mod = hterm.Parser.identifiers.modifierKeys[token.value];
            if (rv[mod] && rv[mod] != "*")throw this.error("Duplicate modifier: " +
                token.value);
            rv[mod] = true
        } else if (token.value in hterm.Parser.identifiers.keyCodes)rv.keyCode = hterm.Parser.identifiers.keyCodes[token.value]; else throw this.error("Unknown key: " + token.value); else if (token.type == "symbol")if (token.value == "*")for (var id in hterm.Parser.identifiers.modifierKeys) {
            var p = hterm.Parser.identifiers.modifierKeys[id];
            if (!rv[p])rv[p] = "*"
        } else throw this.error("Unexpected symbol: " + token.value); else throw this.error("Expected integer or identifier");
        this.skipSpace();
        if (this.ch !=
            "-")break;
        if (rv.keyCode != null)throw this.error("Extra definition after target key");
        this.advance(1)
    }
    if (rv.keyCode == null)throw this.error("Missing target key");
    return rv
};
hterm.Parser.prototype.parseKeyAction = function () {
    this.skipSpace();
    var token = this.parseToken();
    if (token.type == "string")return token.value;
    if (token.type == "identifier") {
        if (token.value in hterm.Parser.identifiers.actions)return hterm.Parser.identifiers.actions[token.value];
        throw this.error("Unknown key action: " + token.value);
    }
    throw this.error("Expected string or identifier");
};
hterm.Parser.prototype.peekString = function () {
    return this.ch == "'" || this.ch == '"'
};
hterm.Parser.prototype.peekIdentifier = function () {
    return this.ch.match(/[a-z_]/i)
};
hterm.Parser.prototype.peekInteger = function () {
    return this.ch.match(/[0-9]/)
};
hterm.Parser.prototype.parseToken = function () {
    if (this.ch == "*") {
        var rv = {type: "symbol", value: this.ch};
        this.advance(1);
        return rv
    }
    if (this.peekIdentifier())return {type: "identifier", value: this.parseIdentifier()};
    if (this.peekString())return {type: "string", value: this.parseString()};
    if (this.peekInteger())return {type: "integer", value: this.parseInteger()};
    throw this.error("Unexpected token");
};
hterm.Parser.prototype.parseIdentifier = function () {
    if (!this.peekIdentifier())throw this.error("Expected identifier");
    return this.parsePattern(/[a-z0-9_]+/ig)
};
hterm.Parser.prototype.parseInteger = function () {
    var base = 10;
    if (this.ch == "0" && this.pos < this.source.length - 1 && this.source.substr(this.pos + 1, 1) == "x")return parseInt(this.parsePattern(/0x[0-9a-f]+/gi));
    return parseInt(this.parsePattern(/\d+/g))
};
hterm.Parser.prototype.parseString = function () {
    var result = "";
    var quote = this.ch;
    if (quote != '"' && quote != "'")throw this.error("String expected");
    this.advance(1);
    var re = new RegExp("[\\\\" + quote + "]", "g");
    while (this.pos < this.source.length) {
        re.lastIndex = this.pos;
        if (!re.exec(this.source))throw this.error("Unterminated string literal");
        result += this.source.substring(this.pos, re.lastIndex - 1);
        this.advance(re.lastIndex - this.pos - 1);
        if (quote == '"' && this.ch == "\\") {
            this.advance(1);
            result += this.parseEscape();
            continue
        }
        if (quote ==
            "'" && this.ch == "\\") {
            result += this.ch;
            this.advance(1);
            continue
        }
        if (this.ch == quote) {
            this.advance(1);
            return result
        }
    }
    throw this.error("Unterminated string literal");
};
hterm.Parser.prototype.parseEscape = function () {
    var map = {
        '"': '"',
        "'": "'",
        "\\": "\\",
        "a": "\u0007",
        "b": "\b",
        "e": "\u001b",
        "f": "\f",
        "n": "\n",
        "r": "\r",
        "t": "\t",
        "v": "\x0B",
        "x": function () {
            var value = this.parsePattern(/[a-z0-9]{2}/ig);
            return String.fromCharCode(parseInt(value, 16))
        },
        "u": function () {
            var value = this.parsePattern(/[a-z0-9]{4}/ig);
            return String.fromCharCode(parseInt(value, 16))
        }
    };
    if (!(this.ch in map))throw this.error("Unknown escape: " + this.ch);
    var value = map[this.ch];
    this.advance(1);
    if (typeof value ==
        "function")value = value.call(this);
    return value
};
hterm.Parser.prototype.parsePattern = function (pattern) {
    if (!pattern.global)throw this.error("Internal error: Span patterns must be global");
    pattern.lastIndex = this.pos;
    var ary = pattern.exec(this.source);
    if (!ary || pattern.lastIndex - ary[0].length != this.pos)throw this.error("Expected match for: " + pattern);
    this.pos = pattern.lastIndex - 1;
    this.advance(1);
    return ary[0]
};
hterm.Parser.prototype.advance = function (count) {
    this.pos += count;
    this.ch = this.source.substr(this.pos, 1)
};
hterm.Parser.prototype.skipSpace = function (opt_expect) {
    if (!/\s/.test(this.ch))return;
    var re = /\s+/gm;
    re.lastIndex = this.pos;
    var source = this.source;
    if (re.exec(source))this.pos = re.lastIndex;
    this.ch = this.source.substr(this.pos, 1);
    if (opt_expect)if (this.ch.indexOf(opt_expect) == -1)throw this.error("Expected one of " + opt_expect + ", found: " + this.ch);
};
"use strict";
hterm.Parser.identifiers = {};
hterm.Parser.identifiers.modifierKeys = {Shift: "shift", Ctrl: "ctrl", Alt: "alt", Meta: "meta"};
hterm.Parser.identifiers.keyCodes = {
    ESC: 27,
    F1: 112,
    F2: 113,
    F3: 114,
    F4: 115,
    F5: 116,
    F6: 117,
    F7: 118,
    F8: 119,
    F9: 120,
    F10: 121,
    F11: 122,
    F12: 123,
    ONE: 49,
    TWO: 50,
    THREE: 51,
    FOUR: 52,
    FIVE: 53,
    SIX: 54,
    SEVEN: 55,
    EIGHT: 56,
    NINE: 57,
    ZERO: 48,
    BACKSPACE: 8,
    TAB: 9,
    Q: 81,
    W: 87,
    E: 69,
    R: 82,
    T: 84,
    Y: 89,
    U: 85,
    I: 73,
    O: 79,
    P: 80,
    CAPSLOCK: 20,
    A: 65,
    S: 83,
    D: 68,
    F: 70,
    G: 71,
    H: 72,
    J: 74,
    K: 75,
    L: 76,
    ENTER: 13,
    Z: 90,
    X: 88,
    C: 67,
    V: 86,
    B: 66,
    N: 78,
    M: 77,
    SPACE: 32,
    PRINT_SCREEN: 42,
    SCROLL_LOCK: 145,
    BREAK: 19,
    INSERT: 45,
    HOME: 36,
    PGUP: 33,
    DEL: 46,
    END: 35,
    PGDOWN: 34,
    UP: 38,
    DOWN: 40,
    RIGHT: 39,
    LEFT: 37,
    NUMLOCK: 144,
    KP0: 96,
    KP1: 97,
    KP2: 98,
    KP3: 99,
    KP4: 100,
    KP5: 101,
    KP6: 102,
    KP7: 103,
    KP8: 104,
    KP9: 105,
    KP_PLUS: 107,
    KP_MINUS: 109,
    KP_STAR: 106,
    KP_DIVIDE: 111,
    KP_DECIMAL: 110,
    NAVIGATE_BACK: 166,
    NAVIGATE_FORWARD: 167,
    RELOAD: 168,
    FULL_SCREEN: 183,
    WINDOW_OVERVIEW: 182,
    BRIGHTNESS_UP: 216,
    BRIGHTNESS_DOWN: 217
};
hterm.Parser.identifiers.actions = {
    CANCEL: hterm.Keyboard.KeyActions.CANCEL,
    DEFAULT: hterm.Keyboard.KeyActions.DEFAULT,
    PASS: hterm.Keyboard.KeyActions.PASS,
    scrollPageUp: function (terminal) {
        terminal.scrollPageUp();
        return hterm.Keyboard.KeyActions.CANCEL
    },
    scrollPageDown: function (terminal) {
        terminal.scrollPageDown();
        return hterm.Keyboard.KeyActions.CANCEL
    },
    scrollToTop: function (terminal) {
        terminal.scrollEnd();
        return hterm.Keyboard.KeyActions.CANCEL
    },
    scrollToBottom: function (terminal) {
        terminal.scrollEnd();
        return hterm.Keyboard.KeyActions.CANCEL
    },
    clearScrollback: function (terminal) {
        terminal.wipeContents();
        return hterm.Keyboard.KeyActions.CANCEL
    }
};
"use strict";
lib.rtdep("lib.f", "lib.Storage");
hterm.PreferenceManager = function (profileId) {
    lib.PreferenceManager.call(this, hterm.defaultStorage, "/hterm/profiles/" + profileId);
    var defs = hterm.PreferenceManager.defaultPreferences;
    Object.keys(defs).forEach(function (key) {
        this.definePreference(key, defs[key][1])
    }.bind(this))
};
hterm.PreferenceManager.categories = {};
hterm.PreferenceManager.categories.Keyboard = "Keyboard";
hterm.PreferenceManager.categories.Appearance = "Appearance";
hterm.PreferenceManager.categories.CopyPaste = "CopyPaste";
hterm.PreferenceManager.categories.Sounds = "Sounds";
hterm.PreferenceManager.categories.Scrolling = "Scrolling";
hterm.PreferenceManager.categories.Encoding = "Encoding";
hterm.PreferenceManager.categories.Miscellaneous = "Miscellaneous";
hterm.PreferenceManager.categoryDefinitions = [{
    id: hterm.PreferenceManager.categories.Appearance,
    text: "Appearance (fonts, colors, images)"
}, {
    id: hterm.PreferenceManager.categories.CopyPaste,
    text: "Copy & Paste"
}, {
    id: hterm.PreferenceManager.categories.Encoding,
    text: "Encoding"
}, {
    id: hterm.PreferenceManager.categories.Keyboard,
    text: "Keyboard"
}, {
    id: hterm.PreferenceManager.categories.Scrolling,
    text: "Scrolling"
}, {id: hterm.PreferenceManager.categories.Sounds, text: "Sounds"}, {
    id: hterm.PreferenceManager.categories.Miscellaneous,
    text: "Misc."
}];
hterm.PreferenceManager.defaultPreferences = {
    "alt-gr-mode": [hterm.PreferenceManager.categories.Keyboard, null, [null, "none", "ctrl-alt", "left-alt", "right-alt"], "Select an AltGr detection hack^Wheuristic.\n" + "\n" + "'null': Autodetect based on navigator.language:\n" + "      'en-us' => 'none', else => 'right-alt'\n" + "'none': Disable any AltGr related munging.\n" + "'ctrl-alt': Assume Ctrl+Alt means AltGr.\n" + "'left-alt': Assume left Alt means AltGr.\n" + "'right-alt': Assume right Alt means AltGr.\n"],
    "alt-backspace-is-meta-backspace": [hterm.PreferenceManager.categories.Keyboard,
        false, "bool", "If set, undoes the Chrome OS Alt-Backspace->DEL remap, so that " + "alt-backspace indeed is alt-backspace."],
    "alt-is-meta": [hterm.PreferenceManager.categories.Keyboard, false, "bool", "Set whether the alt key acts as a meta key or as a distinct alt key."],
    "alt-sends-what": [hterm.PreferenceManager.categories.Keyboard, "escape", ["escape", "8-bit", "browser-key"], "Controls how the alt key is handled.\n" + "\n" + "  escape....... Send an ESC prefix.\n" + "  8-bit........ Add 128 to the unshifted character as in xterm.\n" +
    "  browser-key.. Wait for the keypress event and see what the browser \n" + "                says.  (This won't work well on platforms where the \n" + "                browser performs a default action for some alt sequences.)"],
    "audible-bell-sound": [hterm.PreferenceManager.categories.Sounds, "lib-resource:hterm/audio/bell", "url", "URL of the terminal bell sound.  Empty string for no audible bell."],
    "desktop-notification-bell": [hterm.PreferenceManager.categories.Sounds, false, "bool", "If true, terminal bells in the background will create a Web " +
    "Notification. http://www.w3.org/TR/notifications/\n" + "\n" + "Displaying notifications requires permission from the user. When this " + "option is set to true, hterm will attempt to ask the user for permission " + "if necessary. Note browsers may not show this permission request if it " + "did not originate from a user action.\n" + "\n" + 'Chrome extensions with the "notifications" permission have permission to ' + "display notifications."],
    "background-color": [hterm.PreferenceManager.categories.Appearance, "rgb(16, 16, 16)",
        "color", "The background color for text with no other color attributes."],
    "background-image": [hterm.PreferenceManager.categories.Appearance, "", "string", "CSS value of the background image.  Empty string for no image.\n" + "\n" + "For example:\n" + "  url(https://goo.gl/anedTK)\n" + "  linear-gradient(top bottom, blue, red)"],
    "background-size": [hterm.PreferenceManager.categories.Appearance, "", "string", "CSS value of the background image size.  Defaults to none."],
    "background-position": [hterm.PreferenceManager.categories.Appearance,
        "", "string", "CSS value of the background image position.\n" + "\n" + "For example:\n" + "  10% 10%\n" + "  center"],
    "backspace-sends-backspace": [hterm.PreferenceManager.categories.Keyboard, false, "bool", "If true, the backspace should send BS ('\\x08', aka ^H).  Otherwise " + "the backspace key should send '\\x7f'."],
    "character-map-overrides": [hterm.PreferenceManager.categories.Appearance, null, "value", "This is specified as an object. It is a sparse array, where each " + "property is the character set code and the value is an object that is " +
    "a sparse array itself. In that sparse array, each property is the " + "received character and the value is the displayed character.\n" + "\n" + "For example:\n" + '  {"0":{"+":"\\u2192",",":"\\u2190","-":"\\u2191",".":"\\u2193", ' + '"0":"\\u2588"}}'],
    "close-on-exit": [hterm.PreferenceManager.categories.Miscellaneous, true, "bool", "Whether or not to close the window when the argv exits."],
    "cursor-blink": [hterm.PreferenceManager.categories.Appearance, false, "bool", "Whether or not to blink the cursor by default."],
    "cursor-blink-cycle": [hterm.PreferenceManager.categories.Appearance, [1E3, 500], "value", "The cursor blink rate in milliseconds.\n" + "\n" + "A two element array, the first of which is how long the cursor should be " + "on, second is how long it should be off."],
    "cursor-color": [hterm.PreferenceManager.categories.Appearance, "rgba(255, 0, 0, 0.5)", "color", "The color of the visible cursor."],
    "color-palette-overrides": [hterm.PreferenceManager.categories.Appearance, null, "value", "Override colors in the default palette.\n" +
    "\n" + "This can be specified as an array or an object.  If specified as an " + "object it is assumed to be a sparse array, where each property " + "is a numeric index into the color palette.\n" + "\n" + "Values can be specified as almost any css color value.  This " + "includes #RGB, #RRGGBB, rgb(...), rgba(...), and any color names " + "that are also part of the stock X11 rgb.txt file.\n" + "\n" + "You can use 'null' to specify that the default value should be not " + "be changed.  This is useful for skipping a small number of indicies " +
    "when the value is specified as an array."],
    "copy-on-select": [hterm.PreferenceManager.categories.CopyPaste, true, "bool", "Automatically copy mouse selection to the clipboard."],
    "use-default-window-copy": [hterm.PreferenceManager.categories.CopyPaste, false, "bool", "Whether to use the default window copy behaviour"],
    "clear-selection-after-copy": [hterm.PreferenceManager.categories.CopyPaste, true, "bool", "Whether to clear the selection after copying."],
    "ctrl-plus-minus-zero-zoom": [hterm.PreferenceManager.categories.Keyboard,
        true, "bool", "If true, Ctrl-Plus/Minus/Zero controls zoom.\n" + "If false, Ctrl-Shift-Plus/Minus/Zero controls zoom, Ctrl-Minus sends ^_, " + "Ctrl-Plus/Zero do nothing."],
    "ctrl-c-copy": [hterm.PreferenceManager.categories.Keyboard, false, "bool", "Ctrl+C copies if true, send ^C to host if false.\n" + "Ctrl+Shift+C sends ^C to host if true, copies if false."],
    "ctrl-v-paste": [hterm.PreferenceManager.categories.Keyboard, false, "bool", "Ctrl+V pastes if true, send ^V to host if false.\n" + "Ctrl+Shift+V sends ^V to host if true, pastes if false."],
    "east-asian-ambiguous-as-two-column": [hterm.PreferenceManager.categories.Keyboard, false, "bool", "Set whether East Asian Ambiguous characters have two column width."],
    "enable-8-bit-control": [hterm.PreferenceManager.categories.Keyboard, false, "bool", "True to enable 8-bit control characters, false to ignore them.\n" + "\n" + "We'll respect the two-byte versions of these control characters " + "regardless of this setting."],
    "enable-bold": [hterm.PreferenceManager.categories.Appearance, null, "tristate", "True if we should use bold weight font for text with the bold/bright " +
    "attribute.  False to use the normal weight font.  Null to autodetect."],
    "enable-bold-as-bright": [hterm.PreferenceManager.categories.Appearance, true, "bool", "True if we should use bright colors (8-15 on a 16 color palette) " + "for any text with the bold attribute.  False otherwise."],
    "enable-clipboard-notice": [hterm.PreferenceManager.categories.CopyPaste, true, "bool", "Show a message in the terminal when the host writes to the clipboard."],
    "enable-clipboard-write": [hterm.PreferenceManager.categories.CopyPaste,
        true, "bool", "Allow the host to write directly to the system clipboard."],
    "enable-dec12": [hterm.PreferenceManager.categories.Miscellaneous, false, "bool", "Respect the host's attempt to change the cursor blink status using " + "DEC Private Mode 12."],
    "environment": [hterm.PreferenceManager.categories.Miscellaneous, {"TERM": "xterm-256color"}, "value", "The default environment variables, as an object."],
    "font-family": [hterm.PreferenceManager.categories.Appearance, '"DejaVu Sans Mono", "Everson Mono", FreeMono, "Menlo", "Terminal", ' +
    "monospace", "string", "Default font family for the terminal text."],
    "font-size": [hterm.PreferenceManager.categories.Appearance, 15, "int", "The default font size in pixels."],
    "font-smoothing": [hterm.PreferenceManager.categories.Appearance, "antialiased", "string", "CSS font-smoothing property."],
    "foreground-color": [hterm.PreferenceManager.categories.Appearance, "rgb(240, 240, 240)", "color", "The foreground color for text with no other color attributes."],
    "home-keys-scroll": [hterm.PreferenceManager.categories.Keyboard,
        false, "bool", "If true, home/end will control the terminal scrollbar and shift home/end " + "will send the VT keycodes.  If false then home/end sends VT codes and " + "shift home/end scrolls."],
    "keybindings": [hterm.PreferenceManager.categories.Keyboard, null, "value", "A map of key sequence to key actions.  Key sequences include zero or " + "more modifier keys followed by a key code.  Key codes can be decimal or " + "hexadecimal numbers, or a key identifier.  Key actions can be specified " + "a string to send to the host, or an action identifier.  For a full " +
    "list of key code and action identifiers, see https://goo.gl/8AoD09." + "\n" + "\n" + "Sample keybindings:\n" + '{ "Ctrl-Alt-K": "clearScrollback",\n' + '  "Ctrl-Shift-L": "PASS",\n' + '  "Ctrl-H": "\'HELLO\\n\'"\n' + "}"],
    "max-string-sequence": [hterm.PreferenceManager.categories.Encoding, 1E5, "int", "Max length of a DCS, OSC, PM, or APS sequence before we give up and " + "ignore the code."],
    "media-keys-are-fkeys": [hterm.PreferenceManager.categories.Keyboard, false, "bool", "If true, convert media keys to their Fkey equivalent. If false, let " +
    "the browser handle the keys."],
    "meta-sends-escape": [hterm.PreferenceManager.categories.Keyboard, true, "bool", "Set whether the meta key sends a leading escape or not."],
    "mouse-paste-button": [hterm.PreferenceManager.categories.CopyPaste, null, [null, 0, 1, 2, 3, 4, 5, 6], "Mouse paste button, or null to autodetect.\n" + "\n" + "For autodetect, we'll try to enable middle button paste for non-X11 " + "platforms.  On X11 we move it to button 3."],
    "page-keys-scroll": [hterm.PreferenceManager.categories.Keyboard, false, "bool",
        "If true, page up/down will control the terminal scrollbar and shift " + "page up/down will send the VT keycodes.  If false then page up/down " + "sends VT codes and shift page up/down scrolls."],
    "pass-alt-number": [hterm.PreferenceManager.categories.Keyboard, null, "tristate", "Set whether we should pass Alt-1..9 to the browser.\n" + "\n" + "This is handy when running hterm in a browser tab, so that you don't " + 'lose Chrome\'s "switch to tab" keyboard accelerators.  When not running ' + "in a tab it's better to send these keys to the host so they can be " +
    "used in vim or emacs.\n" + "\n" + "If true, Alt-1..9 will be handled by the browser.  If false, Alt-1..9 " + "will be sent to the host.  If null, autodetect based on browser platform " + "and window type."],
    "pass-ctrl-number": [hterm.PreferenceManager.categories.Keyboard, null, "tristate", "Set whether we should pass Ctrl-1..9 to the browser.\n" + "\n" + "This is handy when running hterm in a browser tab, so that you don't " + 'lose Chrome\'s "switch to tab" keyboard accelerators.  When not running ' + "in a tab it's better to send these keys to the host so they can be " +
    "used in vim or emacs.\n" + "\n" + "If true, Ctrl-1..9 will be handled by the browser.  If false, Ctrl-1..9 " + "will be sent to the host.  If null, autodetect based on browser platform " + "and window type."],
    "pass-meta-number": [hterm.PreferenceManager.categories.Keyboard, null, "tristate", "Set whether we should pass Meta-1..9 to the browser.\n" + "\n" + "This is handy when running hterm in a browser tab, so that you don't " + 'lose Chrome\'s "switch to tab" keyboard accelerators.  When not running ' + "in a tab it's better to send these keys to the host so they can be " +
    "used in vim or emacs.\n" + "\n" + "If true, Meta-1..9 will be handled by the browser.  If false, Meta-1..9 " + "will be sent to the host.  If null, autodetect based on browser platform " + "and window type."],
    "pass-meta-v": [hterm.PreferenceManager.categories.Keyboard, true, "bool", "Set whether meta-V gets passed to host."],
    "receive-encoding": [hterm.PreferenceManager.categories.Encoding, "utf-8", ["utf-8", "raw"], "Set the expected encoding for data received from the host.\n" + "\n" + "Valid values are 'utf-8' and 'raw'."],
    "scroll-on-keystroke": [hterm.PreferenceManager.categories.Scrolling, true, "bool", "If true, scroll to the bottom on any keystroke."],
    "scroll-on-output": [hterm.PreferenceManager.categories.Scrolling, false, "bool", "If true, scroll to the bottom on terminal output."],
    "scrollbar-visible": [hterm.PreferenceManager.categories.Scrolling, true, "bool", "The vertical scrollbar mode."],
    "scroll-wheel-move-multiplier": [hterm.PreferenceManager.categories.Scrolling, 1, "int", "The multiplier for the pixel delta in mousewheel event caused by the " +
    "scroll wheel. Alters how fast the page scrolls."],
    "send-encoding": [hterm.PreferenceManager.categories.Encoding, "utf-8", ["utf-8", "raw"], "Set the encoding for data sent to host."],
    "shift-insert-paste": [hterm.PreferenceManager.categories.Keyboard, true, "bool", "Shift + Insert pastes if true, sent to host if false."],
    "user-css": [hterm.PreferenceManager.categories.Appearance, "", "url", "URL of user stylesheet to include in the terminal document."]
};
hterm.PreferenceManager.prototype = {__proto__: lib.PreferenceManager.prototype};
"use strict";
hterm.PubSub = function () {
    this.observers_ = {}
};
hterm.PubSub.addBehavior = function (obj) {
    var pubsub = new hterm.PubSub;
    for (var m in hterm.PubSub.prototype)obj[m] = hterm.PubSub.prototype[m].bind(pubsub)
};
hterm.PubSub.prototype.subscribe = function (subject, callback) {
    if (!(subject in this.observers_))this.observers_[subject] = [];
    this.observers_[subject].push(callback)
};
hterm.PubSub.prototype.unsubscribe = function (subject, callback) {
    var list = this.observers_[subject];
    if (!list)throw"Invalid subject: " + subject;
    var i = list.indexOf(callback);
    if (i < 0)throw"Not subscribed: " + subject;
    list.splice(i, 1)
};
hterm.PubSub.prototype.publish = function (subject, e, opt_lastCallback) {
    function notifyList(i) {
        if (i < list.length - 1)setTimeout(notifyList, 0, i + 1);
        list[i](e)
    }

    var list = this.observers_[subject];
    if (list)list = [].concat(list);
    if (opt_lastCallback)if (list)list.push(opt_lastCallback); else list = [opt_lastCallback];
    if (list)setTimeout(notifyList, 0, 0)
};
"use strict";
lib.rtdep("lib.f", "lib.wc", "hterm.RowCol", "hterm.Size", "hterm.TextAttributes");
hterm.Screen = function (opt_columnCount) {
    this.rowsArray = [];
    this.columnCount_ = opt_columnCount || 80;
    this.textAttributes = new hterm.TextAttributes(window.document);
    this.cursorPosition = new hterm.RowCol(0, 0);
    this.cursorRowNode_ = null;
    this.cursorNode_ = null;
    this.cursorOffset_ = null
};
hterm.Screen.prototype.getSize = function () {
    return new hterm.Size(this.columnCount_, this.rowsArray.length)
};
hterm.Screen.prototype.getHeight = function () {
    return this.rowsArray.length
};
hterm.Screen.prototype.getWidth = function () {
    return this.columnCount_
};
hterm.Screen.prototype.setColumnCount = function (count) {
    this.columnCount_ = count;
    if (this.cursorPosition.column >= count)this.setCursorPosition(this.cursorPosition.row, count - 1)
};
hterm.Screen.prototype.shiftRow = function () {
    return this.shiftRows(1)[0]
};
hterm.Screen.prototype.shiftRows = function (count) {
    return this.rowsArray.splice(0, count)
};
hterm.Screen.prototype.unshiftRow = function (row) {
    this.rowsArray.splice(0, 0, row)
};
hterm.Screen.prototype.unshiftRows = function (rows) {
    this.rowsArray.unshift.apply(this.rowsArray, rows)
};
hterm.Screen.prototype.popRow = function () {
    return this.popRows(1)[0]
};
hterm.Screen.prototype.popRows = function (count) {
    return this.rowsArray.splice(this.rowsArray.length - count, count)
};
hterm.Screen.prototype.pushRow = function (row) {
    this.rowsArray.push(row)
};
hterm.Screen.prototype.pushRows = function (rows) {
    rows.push.apply(this.rowsArray, rows)
};
hterm.Screen.prototype.insertRow = function (index, row) {
    this.rowsArray.splice(index, 0, row)
};
hterm.Screen.prototype.insertRows = function (index, rows) {
    for (var i = 0; i < rows.length; i++)this.rowsArray.splice(index + i, 0, rows[i])
};
hterm.Screen.prototype.removeRow = function (index) {
    return this.rowsArray.splice(index, 1)[0]
};
hterm.Screen.prototype.removeRows = function (index, count) {
    return this.rowsArray.splice(index, count)
};
hterm.Screen.prototype.invalidateCursorPosition = function () {
    this.cursorPosition.move(0, 0);
    this.cursorRowNode_ = null;
    this.cursorNode_ = null;
    this.cursorOffset_ = null
};
hterm.Screen.prototype.clearCursorRow = function () {
    this.cursorRowNode_.innerHTML = "";
    this.cursorRowNode_.removeAttribute("line-overflow");
    this.cursorOffset_ = 0;
    this.cursorPosition.column = 0;
    this.cursorPosition.overflow = false;
    var text;
    if (this.textAttributes.isDefault())text = ""; else text = lib.f.getWhitespace(this.columnCount_);
    var inverse = this.textAttributes.inverse;
    this.textAttributes.inverse = false;
    this.textAttributes.syncColors();
    var node = this.textAttributes.createContainer(text);
    this.cursorRowNode_.appendChild(node);
    this.cursorNode_ = node;
    this.textAttributes.inverse = inverse;
    this.textAttributes.syncColors()
};
hterm.Screen.prototype.commitLineOverflow = function () {
    this.cursorRowNode_.setAttribute("line-overflow", true)
};
hterm.Screen.prototype.setCursorPosition = function (row, column) {
    if (!this.rowsArray.length) {
        console.warn("Attempt to set cursor position on empty screen.");
        return
    }
    if (row >= this.rowsArray.length) {
        console.error("Row out of bounds: " + row);
        row = this.rowsArray.length - 1
    } else if (row < 0) {
        console.error("Row out of bounds: " + row);
        row = 0
    }
    if (column >= this.columnCount_) {
        console.error("Column out of bounds: " + column);
        column = this.columnCount_ - 1
    } else if (column < 0) {
        console.error("Column out of bounds: " + column);
        column = 0
    }
    this.cursorPosition.overflow =
        false;
    var rowNode = this.rowsArray[row];
    var node = rowNode.firstChild;
    if (!node) {
        node = rowNode.ownerDocument.createTextNode("");
        rowNode.appendChild(node)
    }
    var currentColumn = 0;
    if (rowNode == this.cursorRowNode_) {
        if (column >= this.cursorPosition.column - this.cursorOffset_) {
            node = this.cursorNode_;
            currentColumn = this.cursorPosition.column - this.cursorOffset_
        }
    } else this.cursorRowNode_ = rowNode;
    this.cursorPosition.move(row, column);
    while (node) {
        var offset = column - currentColumn;
        var width = hterm.TextAttributes.nodeWidth(node);
        if (!node.nextSibling || width > offset) {
            this.cursorNode_ = node;
            this.cursorOffset_ = offset;
            return
        }
        currentColumn += width;
        node = node.nextSibling
    }
};
hterm.Screen.prototype.syncSelectionCaret = function (selection) {
    try {
        selection.collapse(this.cursorNode_, this.cursorOffset_)
    } catch (firefoxIgnoredException) {
    }
};
hterm.Screen.prototype.splitNode_ = function (node, offset) {
    var afterNode = node.cloneNode(false);
    var textContent = node.textContent;
    node.textContent = hterm.TextAttributes.nodeSubstr(node, 0, offset);
    afterNode.textContent = lib.wc.substr(textContent, offset);
    if (afterNode.textContent)node.parentNode.insertBefore(afterNode, node.nextSibling);
    if (!node.textContent)node.parentNode.removeChild(node)
};
hterm.Screen.prototype.maybeClipCurrentRow = function () {
    var width = hterm.TextAttributes.nodeWidth(this.cursorRowNode_);
    if (width <= this.columnCount_) {
        if (this.cursorPosition.column >= this.columnCount_) {
            this.setCursorPosition(this.cursorPosition.row, this.columnCount_ - 1);
            this.cursorPosition.overflow = true
        }
        return
    }
    var currentColumn = this.cursorPosition.column;
    this.setCursorPosition(this.cursorPosition.row, this.columnCount_ - 1);
    width = hterm.TextAttributes.nodeWidth(this.cursorNode_);
    if (this.cursorOffset_ < width - 1)this.cursorNode_.textContent =
        hterm.TextAttributes.nodeSubstr(this.cursorNode_, 0, this.cursorOffset_ + 1);
    var rowNode = this.cursorRowNode_;
    var node = this.cursorNode_.nextSibling;
    while (node) {
        rowNode.removeChild(node);
        node = this.cursorNode_.nextSibling
    }
    if (currentColumn < this.columnCount_)this.setCursorPosition(this.cursorPosition.row, currentColumn); else this.cursorPosition.overflow = true
};
hterm.Screen.prototype.insertString = function (str) {
    var cursorNode = this.cursorNode_;
    var cursorNodeText = cursorNode.textContent;
    this.cursorRowNode_.removeAttribute("line-overflow");
    var strWidth = lib.wc.strWidth(str);
    this.cursorPosition.column += strWidth;
    var offset = this.cursorOffset_;
    var reverseOffset = hterm.TextAttributes.nodeWidth(cursorNode) - offset;
    if (reverseOffset < 0) {
        var ws = lib.f.getWhitespace(-reverseOffset);
        if (!(this.textAttributes.underline || this.textAttributes.strikethrough || this.textAttributes.background ||
            this.textAttributes.wcNode || this.textAttributes.tileData != null))str = ws + str; else if (cursorNode.nodeType == 3 || !(cursorNode.wcNode || cursorNode.tileNode || cursorNode.style.textDecoration || cursorNode.style.backgroundColor))cursorNode.textContent = cursorNodeText += ws; else {
            var wsNode = cursorNode.ownerDocument.createTextNode(ws);
            this.cursorRowNode_.insertBefore(wsNode, cursorNode.nextSibling);
            this.cursorNode_ = cursorNode = wsNode;
            this.cursorOffset_ = offset = -reverseOffset;
            cursorNodeText = ws
        }
        reverseOffset = 0
    }
    if (this.textAttributes.matchesContainer(cursorNode)) {
        if (reverseOffset ==
            0)cursorNode.textContent = cursorNodeText + str; else if (offset == 0)cursorNode.textContent = str + cursorNodeText; else cursorNode.textContent = hterm.TextAttributes.nodeSubstr(cursorNode, 0, offset) + str + hterm.TextAttributes.nodeSubstr(cursorNode, offset);
        this.cursorOffset_ += strWidth;
        return
    }
    if (offset == 0) {
        var previousSibling = cursorNode.previousSibling;
        if (previousSibling && this.textAttributes.matchesContainer(previousSibling)) {
            previousSibling.textContent += str;
            this.cursorNode_ = previousSibling;
            this.cursorOffset_ = lib.wc.strWidth(previousSibling.textContent);
            return
        }
        var newNode = this.textAttributes.createContainer(str);
        this.cursorRowNode_.insertBefore(newNode, cursorNode);
        this.cursorNode_ = newNode;
        this.cursorOffset_ = strWidth;
        return
    }
    if (reverseOffset == 0) {
        var nextSibling = cursorNode.nextSibling;
        if (nextSibling && this.textAttributes.matchesContainer(nextSibling)) {
            nextSibling.textContent = str + nextSibling.textContent;
            this.cursorNode_ = nextSibling;
            this.cursorOffset_ = lib.wc.strWidth(str);
            return
        }
        var newNode = this.textAttributes.createContainer(str);
        this.cursorRowNode_.insertBefore(newNode,
            nextSibling);
        this.cursorNode_ = newNode;
        this.cursorOffset_ = hterm.TextAttributes.nodeWidth(newNode);
        return
    }
    this.splitNode_(cursorNode, offset);
    var newNode = this.textAttributes.createContainer(str);
    this.cursorRowNode_.insertBefore(newNode, cursorNode.nextSibling);
    this.cursorNode_ = newNode;
    this.cursorOffset_ = strWidth
};
hterm.Screen.prototype.overwriteString = function (str) {
    var maxLength = this.columnCount_ - this.cursorPosition.column;
    if (!maxLength)return [str];
    var width = lib.wc.strWidth(str);
    if (this.textAttributes.matchesContainer(this.cursorNode_) && this.cursorNode_.textContent.substr(this.cursorOffset_) == str) {
        this.cursorOffset_ += width;
        this.cursorPosition.column += width;
        return
    }
    this.deleteChars(Math.min(width, maxLength));
    this.insertString(str)
};
hterm.Screen.prototype.deleteChars = function (count) {
    var node = this.cursorNode_;
    var offset = this.cursorOffset_;
    var currentCursorColumn = this.cursorPosition.column;
    count = Math.min(count, this.columnCount_ - currentCursorColumn);
    if (!count)return 0;
    var rv = count;
    var startLength, endLength;
    while (node && count) {
        startLength = hterm.TextAttributes.nodeWidth(node);
        node.textContent = hterm.TextAttributes.nodeSubstr(node, 0, offset) + hterm.TextAttributes.nodeSubstr(node, offset + count);
        endLength = hterm.TextAttributes.nodeWidth(node);
        count -= startLength - endLength;
        if (offset < startLength && endLength && startLength == endLength) {
            var spaceNode = this.textAttributes.createContainer(" ");
            node.parentNode.insertBefore(spaceNode, node.nextSibling);
            node.textContent = "";
            endLength = 0;
            count -= 1
        }
        var nextNode = node.nextSibling;
        if (endLength == 0 && node != this.cursorNode_)node.parentNode.removeChild(node);
        node = nextNode;
        offset = 0
    }
    if (this.cursorNode_.nodeType != 3 && !this.cursorNode_.textContent) {
        var cursorNode = this.cursorNode_;
        if (cursorNode.previousSibling) {
            this.cursorNode_ =
                cursorNode.previousSibling;
            this.cursorOffset_ = hterm.TextAttributes.nodeWidth(cursorNode.previousSibling)
        } else if (cursorNode.nextSibling) {
            this.cursorNode_ = cursorNode.nextSibling;
            this.cursorOffset_ = 0
        } else {
            var emptyNode = this.cursorRowNode_.ownerDocument.createTextNode("");
            this.cursorRowNode_.appendChild(emptyNode);
            this.cursorNode_ = emptyNode;
            this.cursorOffset_ = 0
        }
        this.cursorRowNode_.removeChild(cursorNode)
    }
    return rv
};
hterm.Screen.prototype.getLineStartRow_ = function (row) {
    while (row.previousSibling && row.previousSibling.hasAttribute("line-overflow"))row = row.previousSibling;
    return row
};
hterm.Screen.prototype.getLineText_ = function (row) {
    var rowText = "";
    while (row) {
        rowText += row.textContent;
        if (row.hasAttribute("line-overflow"))row = row.nextSibling; else break
    }
    return rowText
};
hterm.Screen.prototype.getXRowAncestor_ = function (node) {
    while (node) {
        if (node.nodeName === "X-ROW")break;
        node = node.parentNode
    }
    return node
};
hterm.Screen.prototype.getPositionWithOverflow_ = function (row, node, offset) {
    if (!node)return -1;
    var ancestorRow = this.getXRowAncestor_(node);
    if (!ancestorRow)return -1;
    var position = 0;
    while (ancestorRow != row) {
        position += hterm.TextAttributes.nodeWidth(row);
        if (row.hasAttribute("line-overflow") && row.nextSibling)row = row.nextSibling; else return -1
    }
    return position + this.getPositionWithinRow_(row, node, offset)
};
hterm.Screen.prototype.getPositionWithinRow_ = function (row, node, offset) {
    if (node.parentNode != row)return this.getPositionWithinRow_(node.parentNode, node, offset) + this.getPositionWithinRow_(row, node.parentNode, 0);
    var position = 0;
    for (var i = 0; i < row.childNodes.length; i++) {
        var currentNode = row.childNodes[i];
        if (currentNode == node)return position + offset;
        position += hterm.TextAttributes.nodeWidth(currentNode)
    }
    return -1
};
hterm.Screen.prototype.getNodeAndOffsetWithOverflow_ = function (row, position) {
    while (row && position > hterm.TextAttributes.nodeWidth(row))if (row.hasAttribute("line-overflow") && row.nextSibling) {
        position -= hterm.TextAttributes.nodeWidth(row);
        row = row.nextSibling
    } else return -1;
    return this.getNodeAndOffsetWithinRow_(row, position)
};
hterm.Screen.prototype.getNodeAndOffsetWithinRow_ = function (row, position) {
    for (var i = 0; i < row.childNodes.length; i++) {
        var node = row.childNodes[i];
        var nodeTextWidth = hterm.TextAttributes.nodeWidth(node);
        if (position <= nodeTextWidth)if (node.nodeName === "SPAN")return this.getNodeAndOffsetWithinRow_(node, position); else return [node, position];
        position -= nodeTextWidth
    }
    return null
};
hterm.Screen.prototype.setRange_ = function (row, start, end, range) {
    var startNodeAndOffset = this.getNodeAndOffsetWithOverflow_(row, start);
    if (startNodeAndOffset == null)return;
    var endNodeAndOffset = this.getNodeAndOffsetWithOverflow_(row, end);
    if (endNodeAndOffset == null)return;
    range.setStart(startNodeAndOffset[0], startNodeAndOffset[1]);
    range.setEnd(endNodeAndOffset[0], endNodeAndOffset[1])
};
hterm.Screen.prototype.expandSelection = function (selection) {
    if (!selection)return;
    var range = selection.getRangeAt(0);
    if (!range || range.toString().match(/\s/))return;
    var row = this.getLineStartRow_(this.getXRowAncestor_(range.startContainer));
    if (!row)return;
    var startPosition = this.getPositionWithOverflow_(row, range.startContainer, range.startOffset);
    if (startPosition == -1)return;
    var endPosition = this.getPositionWithOverflow_(row, range.endContainer, range.endOffset);
    if (endPosition == -1)return;
    var leftMatch = "[^\\s\\[\\](){}<>\"'\\^!@#$%&*,;:`]";
    var rightMatch = "[^\\s\\[\\](){}<>\"'\\^!@#$%&*,;:~.`]";
    var insideMatch = "[^\\s\\[\\](){}<>\"'\\^]*";
    var rowText = this.getLineText_(row);
    var lineUpToRange = lib.wc.substring(rowText, 0, endPosition);
    var leftRegularExpression = new RegExp(leftMatch + insideMatch + "$");
    var expandedStart = lineUpToRange.search(leftRegularExpression);
    if (expandedStart == -1 || expandedStart > startPosition)return;
    var lineFromRange = lib.wc.substring(rowText, startPosition, lib.wc.strWidth(rowText));
    var rightRegularExpression = new RegExp("^" + insideMatch +
        rightMatch);
    var found = lineFromRange.match(rightRegularExpression);
    if (!found)return;
    var expandedEnd = startPosition + lib.wc.strWidth(found[0]);
    if (expandedEnd == -1 || expandedEnd < endPosition)return;
    this.setRange_(row, expandedStart, expandedEnd, range);
    selection.addRange(range)
};
"use strict";
lib.rtdep("lib.f", "hterm.PubSub", "hterm.Size");
hterm.ScrollPort = function (rowProvider) {
    hterm.PubSub.addBehavior(this);
    this.rowProvider_ = rowProvider;
    this.characterSize = new hterm.Size(10, 10);
    this.ruler_ = null;
    this.selection = new hterm.ScrollPort.Selection(this);
    this.currentRowNodeCache_ = null;
    this.previousRowNodeCache_ = {};
    this.lastScreenWidth_ = null;
    this.lastScreenHeight_ = null;
    this.selectionEnabled_ = true;
    this.lastRowCount_ = 0;
    this.scrollWheelMultiplier_ = 1;
    this.isScrolledEnd = true;
    this.xrowCssRule_ = null;
    this.currentScrollbarWidthPx = 16;
    this.ctrlVPaste = false;
    this.div_ = null;
    this.document_ = null;
    this.timeouts_ = {};
    this.observers_ = {};
    this.DEBUG_ = false
};
hterm.ScrollPort.Selection = function (scrollPort) {
    this.scrollPort_ = scrollPort;
    this.startRow = null;
    this.endRow = null;
    this.isMultiline = null;
    this.isCollapsed = null
};
hterm.ScrollPort.Selection.prototype.findFirstChild = function (parent, childAry) {
    var node = parent.firstChild;
    while (node) {
        if (childAry.indexOf(node) != -1)return node;
        if (node.childNodes.length) {
            var rv = this.findFirstChild(node, childAry);
            if (rv)return rv
        }
        node = node.nextSibling
    }
    return null
};
hterm.ScrollPort.Selection.prototype.sync = function () {
    var self = this;

    function anchorFirst() {
        self.startRow = anchorRow;
        self.startNode = selection.anchorNode;
        self.startOffset = selection.anchorOffset;
        self.endRow = focusRow;
        self.endNode = selection.focusNode;
        self.endOffset = selection.focusOffset
    }

    function focusFirst() {
        self.startRow = focusRow;
        self.startNode = selection.focusNode;
        self.startOffset = selection.focusOffset;
        self.endRow = anchorRow;
        self.endNode = selection.anchorNode;
        self.endOffset = selection.anchorOffset
    }

    var selection =
        this.scrollPort_.getDocument().getSelection();
    this.startRow = null;
    this.endRow = null;
    this.isMultiline = null;
    this.isCollapsed = !selection || selection.isCollapsed;
    if (this.isCollapsed)return;
    var anchorRow = selection.anchorNode;
    while (anchorRow && !("rowIndex" in anchorRow))anchorRow = anchorRow.parentNode;
    if (!anchorRow) {
        console.error("Selection anchor is not rooted in a row node: " + selection.anchorNode.nodeName);
        return
    }
    var focusRow = selection.focusNode;
    while (focusRow && !("rowIndex" in focusRow))focusRow = focusRow.parentNode;
    if (!focusRow) {
        console.error("Selection focus is not rooted in a row node: " + selection.focusNode.nodeName);
        return
    }
    if (anchorRow.rowIndex < focusRow.rowIndex)anchorFirst(); else if (anchorRow.rowIndex > focusRow.rowIndex)focusFirst(); else if (selection.focusNode == selection.anchorNode)if (selection.anchorOffset < selection.focusOffset)anchorFirst(); else focusFirst(); else {
        var firstNode = this.findFirstChild(anchorRow, [selection.anchorNode, selection.focusNode]);
        if (!firstNode)throw new Error("Unexpected error syncing selection.");
        if (firstNode == selection.anchorNode)anchorFirst(); else focusFirst()
    }
    this.isMultiline = anchorRow.rowIndex != focusRow.rowIndex
};
hterm.ScrollPort.prototype.decorate = function (div) {
    this.div_ = div;
    this.iframe_ = div.ownerDocument.createElement("iframe");
    this.iframe_.style.cssText = "border: 0;" + "height: 100%;" + "position: absolute;" + "width: 100%";
    if ("mozInnerScreenX" in window)this.iframe_.src = "#";
    div.appendChild(this.iframe_);
    this.iframe_.contentWindow.addEventListener("resize", this.onResize_.bind(this));
    var doc = this.document_ = this.iframe_.contentDocument;
    doc.body.style.cssText = "margin: 0px;" + "padding: 0px;" + "height: 100%;" + "width: 100%;" +
        "overflow: hidden;" + "cursor: text;" + "-webkit-user-select: none;" + "-moz-user-select: none;";
    var style = doc.createElement("style");
    style.textContent = "x-row {}";
    doc.head.appendChild(style);
    this.xrowCssRule_ = doc.styleSheets[0].cssRules[0];
    this.xrowCssRule_.style.display = "block";
    this.userCssLink_ = doc.createElement("link");
    this.userCssLink_.setAttribute("rel", "stylesheet");
    this.screen_ = doc.createElement("x-screen");
    this.screen_.setAttribute("role", "textbox");
    this.screen_.setAttribute("tabindex", "-1");
    this.screen_.style.cssText =
        "display: block;" + "font-family: monospace;" + "font-size: 15px;" + "font-variant-ligatures: none;" + "height: 100%;" + "overflow-y: scroll; overflow-x: hidden;" + "white-space: pre;" + "width: 100%;" + "outline: none !important";
    doc.body.appendChild(this.screen_);
    this.screen_.addEventListener("scroll", this.onScroll_.bind(this));
    this.screen_.addEventListener("mousewheel", this.onScrollWheel_.bind(this));
    this.screen_.addEventListener("DOMMouseScroll", this.onScrollWheel_.bind(this));
    this.screen_.addEventListener("copy",
        this.onCopy_.bind(this));
    this.screen_.addEventListener("paste", this.onPaste_.bind(this));
    doc.body.addEventListener("keydown", this.onBodyKeyDown_.bind(this));
    this.rowNodes_ = doc.createElement("div");
    this.rowNodes_.style.cssText = "display: block;" + "position: fixed;" + "overflow: hidden;" + "-webkit-user-select: text;" + "-moz-user-select: text;";
    this.screen_.appendChild(this.rowNodes_);
    this.topSelectBag_ = doc.createElement("x-select-bag");
    this.topSelectBag_.style.cssText = "display: block;" + "overflow: hidden;" +
        "white-space: pre;";
    this.bottomSelectBag_ = this.topSelectBag_.cloneNode();
    this.topFold_ = doc.createElement("x-fold");
    this.topFold_.style.cssText = "display: block;";
    this.rowNodes_.appendChild(this.topFold_);
    this.bottomFold_ = this.topFold_.cloneNode();
    this.rowNodes_.appendChild(this.bottomFold_);
    this.scrollArea_ = doc.createElement("div");
    this.scrollArea_.style.cssText = "visibility: hidden";
    this.screen_.appendChild(this.scrollArea_);
    this.svg_ = this.div_.ownerDocument.createElementNS("http://www.w3.org/2000/svg",
        "svg");
    this.svg_.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    this.svg_.setAttribute("version", "1.1");
    this.svg_.style.cssText = "position: absolute;" + "top: 0;" + "left: 0;" + "visibility: hidden";
    this.pasteTarget_ = doc.createElement("textarea");
    this.pasteTarget_.setAttribute("tabindex", "-1");
    this.pasteTarget_.style.cssText = "position: absolute;" + "height: 1px;" + "width: 1px;" + "left: 0px; " + "bottom: 0px;" + "opacity: 0";
    this.pasteTarget_.contentEditable = true;
    this.screen_.appendChild(this.pasteTarget_);
    this.pasteTarget_.addEventListener("textInput",
        this.handlePasteTargetTextInput_.bind(this));
    this.resize()
};
hterm.ScrollPort.prototype.setFontFamily = function (fontFamily, opt_smoothing) {
    this.screen_.style.fontFamily = fontFamily;
    if (opt_smoothing)this.screen_.style.webkitFontSmoothing = opt_smoothing; else this.screen_.style.webkitFontSmoothing = "";
    this.syncCharacterSize()
};
hterm.ScrollPort.prototype.getFontFamily = function () {
    return this.screen_.style.fontFamily
};
hterm.ScrollPort.prototype.setUserCss = function (url) {
    if (url) {
        this.userCssLink_.setAttribute("href", url);
        if (!this.userCssLink_.parentNode)this.document_.head.appendChild(this.userCssLink_)
    } else if (this.userCssLink_.parentNode)this.document_.head.removeChild(this.userCssLink_)
};
hterm.ScrollPort.prototype.focus = function () {
    this.iframe_.focus();
    this.screen_.focus()
};
hterm.ScrollPort.prototype.getForegroundColor = function () {
    return this.screen_.style.color
};
hterm.ScrollPort.prototype.setForegroundColor = function (color) {
    this.screen_.style.color = color
};
hterm.ScrollPort.prototype.getBackgroundColor = function () {
    return this.screen_.style.backgroundColor
};
hterm.ScrollPort.prototype.setBackgroundColor = function (color) {
    this.screen_.style.backgroundColor = color
};
hterm.ScrollPort.prototype.setBackgroundImage = function (image) {
    this.screen_.style.backgroundImage = image
};
hterm.ScrollPort.prototype.setBackgroundSize = function (size) {
    this.screen_.style.backgroundSize = size
};
hterm.ScrollPort.prototype.setBackgroundPosition = function (position) {
    this.screen_.style.backgroundPosition = position
};
hterm.ScrollPort.prototype.setCtrlVPaste = function (ctrlVPaste) {
    this.ctrlVPaste = ctrlVPaste
};
hterm.ScrollPort.prototype.getScreenSize = function () {
    var size = hterm.getClientSize(this.screen_);
    return {height: size.height, width: size.width - this.currentScrollbarWidthPx}
};
hterm.ScrollPort.prototype.getScreenWidth = function () {
    return this.getScreenSize().width
};
hterm.ScrollPort.prototype.getScreenHeight = function () {
    return this.getScreenSize().height
};
hterm.ScrollPort.prototype.getDocument = function () {
    return this.document_
};
hterm.ScrollPort.prototype.getScreenNode = function () {
    return this.screen_
};
hterm.ScrollPort.prototype.resetCache = function () {
    this.currentRowNodeCache_ = null;
    this.previousRowNodeCache_ = {}
};
hterm.ScrollPort.prototype.setRowProvider = function (rowProvider) {
    this.resetCache();
    this.rowProvider_ = rowProvider;
    this.scheduleRedraw()
};
hterm.ScrollPort.prototype.invalidate = function () {
    var node = this.topFold_.nextSibling;
    while (node != this.bottomFold_) {
        var nextSibling = node.nextSibling;
        node.parentElement.removeChild(node);
        node = nextSibling
    }
    this.previousRowNodeCache_ = null;
    var topRowIndex = this.getTopRowIndex();
    var bottomRowIndex = this.getBottomRowIndex(topRowIndex);
    this.drawVisibleRows_(topRowIndex, bottomRowIndex)
};
hterm.ScrollPort.prototype.scheduleInvalidate = function () {
    if (this.timeouts_.invalidate)return;
    var self = this;
    this.timeouts_.invalidate = setTimeout(function () {
        delete self.timeouts_.invalidate;
        self.invalidate()
    }, 0)
};
hterm.ScrollPort.prototype.setFontSize = function (px) {
    this.screen_.style.fontSize = px + "px";
    this.syncCharacterSize()
};
hterm.ScrollPort.prototype.getFontSize = function () {
    return parseInt(this.screen_.style.fontSize)
};
hterm.ScrollPort.prototype.measureCharacterSize = function (opt_weight) {
    if (!this.ruler_) {
        this.ruler_ = this.document_.createElement("div");
        this.ruler_.style.cssText = "position: absolute;" + "top: 0;" + "left: 0;" + "visibility: hidden;" + "height: auto !important;" + "width: auto !important;";
        this.rulerSpan_ = this.document_.createElement("span");
        this.rulerSpan_.textContent = "XXXXXXXXXXXXXXXXXXXX" + "XXXXXXXXXXXXXXXXXXXX" + "XXXXXXXXXXXXXXXXXXXX" + "XXXXXXXXXXXXXXXXXXXX" + "XXXXXXXXXXXXXXXXXXXX";
        this.ruler_.appendChild(this.rulerSpan_);
        this.rulerBaseline_ = this.document_.createElement("span");
        this.rulerBaseline_.style.fontSize = "0px";
        this.rulerBaseline_.textContent = "X"
    }
    this.rulerSpan_.style.fontWeight = opt_weight || "";
    this.rowNodes_.appendChild(this.ruler_);
    var rulerSize = hterm.getClientSize(this.rulerSpan_);
    var size = new hterm.Size(rulerSize.width / this.ruler_.textContent.length, rulerSize.height);
    this.ruler_.appendChild(this.rulerBaseline_);
    size.baseline = this.rulerBaseline_.offsetTop;
    this.ruler_.removeChild(this.rulerBaseline_);
    this.rowNodes_.removeChild(this.ruler_);
    this.div_.ownerDocument.body.appendChild(this.svg_);
    size.zoomFactor = this.svg_.currentScale;
    this.div_.ownerDocument.body.removeChild(this.svg_);
    return size
};
hterm.ScrollPort.prototype.syncCharacterSize = function () {
    this.characterSize = this.measureCharacterSize();
    var lineHeight = this.characterSize.height + "px";
    this.xrowCssRule_.style.height = lineHeight;
    this.topSelectBag_.style.height = lineHeight;
    this.bottomSelectBag_.style.height = lineHeight;
    this.resize();
    if (this.DEBUG_)this.document_.body.style.paddingTop = this.document_.body.style.paddingBottom = 3 * this.characterSize.height + "px"
};
hterm.ScrollPort.prototype.resize = function () {
    this.currentScrollbarWidthPx = hterm.getClientWidth(this.screen_) - this.screen_.clientWidth;
    this.syncScrollHeight();
    this.syncRowNodesDimensions_();
    var self = this;
    this.publish("resize", {scrollPort: this}, function () {
        self.scrollRowToBottom(self.rowProvider_.getRowCount());
        self.scheduleRedraw()
    })
};
hterm.ScrollPort.prototype.syncRowNodesDimensions_ = function () {
    var screenSize = this.getScreenSize();
    this.lastScreenWidth_ = screenSize.width;
    this.lastScreenHeight_ = screenSize.height;
    this.visibleRowCount = lib.f.smartFloorDivide(screenSize.height, this.characterSize.height);
    var visibleRowsHeight = this.visibleRowCount * this.characterSize.height;
    this.visibleRowTopMargin = 0;
    this.visibleRowBottomMargin = screenSize.height - visibleRowsHeight;
    this.topFold_.style.marginBottom = this.visibleRowTopMargin + "px";
    var topFoldOffset =
        0;
    var node = this.topFold_.previousSibling;
    while (node) {
        topFoldOffset += hterm.getClientHeight(node);
        node = node.previousSibling
    }
    this.rowNodes_.style.width = screenSize.width + "px";
    this.rowNodes_.style.height = visibleRowsHeight + topFoldOffset + "px";
    this.rowNodes_.style.left = this.screen_.offsetLeft + "px";
    this.rowNodes_.style.top = this.screen_.offsetTop - topFoldOffset + "px"
};
hterm.ScrollPort.prototype.syncScrollHeight = function () {
    this.lastRowCount_ = this.rowProvider_.getRowCount();
    this.scrollArea_.style.height = this.characterSize.height * this.lastRowCount_ + this.visibleRowTopMargin + this.visibleRowBottomMargin + "px"
};
hterm.ScrollPort.prototype.scheduleRedraw = function () {
    if (this.timeouts_.redraw)return;
    var self = this;
    this.timeouts_.redraw = setTimeout(function () {
        delete self.timeouts_.redraw;
        self.redraw_()
    }, 0)
};
hterm.ScrollPort.prototype.redraw_ = function () {
    this.resetSelectBags_();
    this.selection.sync();
    this.syncScrollHeight();
    this.currentRowNodeCache_ = {};
    var topRowIndex = this.getTopRowIndex();
    var bottomRowIndex = this.getBottomRowIndex(topRowIndex);
    this.drawTopFold_(topRowIndex);
    this.drawBottomFold_(bottomRowIndex);
    this.drawVisibleRows_(topRowIndex, bottomRowIndex);
    this.syncRowNodesDimensions_();
    this.previousRowNodeCache_ = this.currentRowNodeCache_;
    this.currentRowNodeCache_ = null;
    this.isScrolledEnd = this.getTopRowIndex() +
        this.visibleRowCount >= this.lastRowCount_
};
hterm.ScrollPort.prototype.drawTopFold_ = function (topRowIndex) {
    if (!this.selection.startRow || this.selection.startRow.rowIndex >= topRowIndex) {
        if (this.rowNodes_.firstChild != this.topFold_)this.rowNodes_.insertBefore(this.topFold_, this.rowNodes_.firstChild);
        return
    }
    if (!this.selection.isMultiline || this.selection.endRow.rowIndex >= topRowIndex) {
        if (this.selection.startRow.nextSibling != this.topFold_)this.rowNodes_.insertBefore(this.topFold_, this.selection.startRow.nextSibling)
    } else {
        if (this.selection.endRow.nextSibling != this.topFold_)this.rowNodes_.insertBefore(this.topFold_,
            this.selection.endRow.nextSibling);
        while (this.selection.startRow.nextSibling != this.selection.endRow)this.rowNodes_.removeChild(this.selection.startRow.nextSibling)
    }
    while (this.rowNodes_.firstChild != this.selection.startRow)this.rowNodes_.removeChild(this.rowNodes_.firstChild)
};
hterm.ScrollPort.prototype.drawBottomFold_ = function (bottomRowIndex) {
    if (!this.selection.endRow || this.selection.endRow.rowIndex <= bottomRowIndex) {
        if (this.rowNodes_.lastChild != this.bottomFold_)this.rowNodes_.appendChild(this.bottomFold_);
        return
    }
    if (!this.selection.isMultiline || this.selection.startRow.rowIndex <= bottomRowIndex) {
        if (this.bottomFold_.nextSibling != this.selection.endRow)this.rowNodes_.insertBefore(this.bottomFold_, this.selection.endRow)
    } else {
        if (this.bottomFold_.nextSibling != this.selection.startRow)this.rowNodes_.insertBefore(this.bottomFold_,
            this.selection.startRow);
        while (this.selection.startRow.nextSibling != this.selection.endRow)this.rowNodes_.removeChild(this.selection.startRow.nextSibling)
    }
    while (this.rowNodes_.lastChild != this.selection.endRow)this.rowNodes_.removeChild(this.rowNodes_.lastChild)
};
hterm.ScrollPort.prototype.drawVisibleRows_ = function (topRowIndex, bottomRowIndex) {
    var self = this;

    function removeUntilNode(currentNode, targetNode) {
        while (currentNode != targetNode) {
            if (!currentNode)throw"Did not encounter target node";
            if (currentNode == self.bottomFold_)throw"Encountered bottom fold before target node";
            var deadNode = currentNode;
            currentNode = currentNode.nextSibling;
            deadNode.parentNode.removeChild(deadNode)
        }
    }

    var selectionStartRow = this.selection.startRow;
    var selectionEndRow = this.selection.endRow;
    var bottomFold = this.bottomFold_;
    var node = this.topFold_.nextSibling;
    var targetDrawCount = Math.min(this.visibleRowCount, this.rowProvider_.getRowCount());
    for (var drawCount = 0; drawCount < targetDrawCount; drawCount++) {
        var rowIndex = topRowIndex + drawCount;
        if (node == bottomFold) {
            var newNode = this.fetchRowNode_(rowIndex);
            if (!newNode) {
                console.log("Couldn't fetch row index: " + rowIndex);
                break
            }
            this.rowNodes_.insertBefore(newNode, node);
            continue
        }
        if (node.rowIndex == rowIndex) {
            node = node.nextSibling;
            continue
        }
        if (selectionStartRow &&
            selectionStartRow.rowIndex == rowIndex) {
            removeUntilNode(node, selectionStartRow);
            node = selectionStartRow.nextSibling;
            continue
        }
        if (selectionEndRow && selectionEndRow.rowIndex == rowIndex) {
            removeUntilNode(node, selectionEndRow);
            node = selectionEndRow.nextSibling;
            continue
        }
        if (node == selectionStartRow || node == selectionEndRow) {
            var newNode = this.fetchRowNode_(rowIndex);
            if (!newNode) {
                console.log("Couldn't fetch row index: " + rowIndex);
                break
            }
            this.rowNodes_.insertBefore(newNode, node);
            continue
        }
        var newNode = this.fetchRowNode_(rowIndex);
        if (!newNode) {
            console.log("Couldn't fetch row index: " + rowIndex);
            break
        }
        if (node == newNode) {
            node = node.nextSibling;
            continue
        }
        this.rowNodes_.insertBefore(newNode, node);
        if (!newNode.nextSibling)debugger;
        this.rowNodes_.removeChild(node);
        node = newNode.nextSibling
    }
    if (node != this.bottomFold_)removeUntilNode(node, bottomFold)
};
hterm.ScrollPort.prototype.resetSelectBags_ = function () {
    if (this.topSelectBag_.parentNode) {
        this.topSelectBag_.textContent = "";
        this.topSelectBag_.parentNode.removeChild(this.topSelectBag_)
    }
    if (this.bottomSelectBag_.parentNode) {
        this.bottomSelectBag_.textContent = "";
        this.bottomSelectBag_.parentNode.removeChild(this.bottomSelectBag_)
    }
};
hterm.ScrollPort.prototype.cacheRowNode_ = function (rowNode) {
    this.currentRowNodeCache_[rowNode.rowIndex] = rowNode
};
hterm.ScrollPort.prototype.fetchRowNode_ = function (rowIndex) {
    var node;
    if (this.previousRowNodeCache_ && rowIndex in this.previousRowNodeCache_)node = this.previousRowNodeCache_[rowIndex]; else node = this.rowProvider_.getRowNode(rowIndex);
    if (this.currentRowNodeCache_)this.cacheRowNode_(node);
    return node
};
hterm.ScrollPort.prototype.selectAll = function () {
    var firstRow;
    if (this.topFold_.nextSibling.rowIndex != 0) {
        while (this.topFold_.previousSibling)this.rowNodes_.removeChild(this.topFold_.previousSibling);
        firstRow = this.fetchRowNode_(0);
        this.rowNodes_.insertBefore(firstRow, this.topFold_);
        this.syncRowNodesDimensions_()
    } else firstRow = this.topFold_.nextSibling;
    var lastRowIndex = this.rowProvider_.getRowCount() - 1;
    var lastRow;
    if (this.bottomFold_.previousSibling.rowIndex != lastRowIndex) {
        while (this.bottomFold_.nextSibling)this.rowNodes_.removeChild(this.bottomFold_.nextSibling);
        lastRow = this.fetchRowNode_(lastRowIndex);
        this.rowNodes_.appendChild(lastRow)
    } else lastRow = this.bottomFold_.previousSibling.rowIndex;
    var selection = this.document_.getSelection();
    selection.collapse(firstRow, 0);
    selection.extend(lastRow, lastRow.childNodes.length);
    this.selection.sync()
};
hterm.ScrollPort.prototype.getScrollMax_ = function (e) {
    return hterm.getClientHeight(this.scrollArea_) + this.visibleRowTopMargin + this.visibleRowBottomMargin - hterm.getClientHeight(this.screen_)
};
hterm.ScrollPort.prototype.scrollRowToTop = function (rowIndex) {
    this.syncScrollHeight();
    this.isScrolledEnd = rowIndex + this.visibleRowCount >= this.lastRowCount_;
    var scrollTop = rowIndex * this.characterSize.height + this.visibleRowTopMargin;
    var scrollMax = this.getScrollMax_();
    if (scrollTop > scrollMax)scrollTop = scrollMax;
    if (this.screen_.scrollTop == scrollTop)return;
    this.screen_.scrollTop = scrollTop;
    this.scheduleRedraw()
};
hterm.ScrollPort.prototype.scrollRowToBottom = function (rowIndex) {
    this.syncScrollHeight();
    this.isScrolledEnd = rowIndex + this.visibleRowCount >= this.lastRowCount_;
    var scrollTop = rowIndex * this.characterSize.height + this.visibleRowTopMargin + this.visibleRowBottomMargin;
    scrollTop -= this.visibleRowCount * this.characterSize.height;
    if (scrollTop < 0)scrollTop = 0;
    if (this.screen_.scrollTop == scrollTop)return;
    this.screen_.scrollTop = scrollTop
};
hterm.ScrollPort.prototype.getTopRowIndex = function () {
    return lib.f.smartFloorDivide(this.screen_.scrollTop, this.characterSize.height)
};
hterm.ScrollPort.prototype.getBottomRowIndex = function (topRowIndex) {
    return topRowIndex + this.visibleRowCount - 1
};
hterm.ScrollPort.prototype.onScroll_ = function (e) {
    var screenSize = this.getScreenSize();
    if (screenSize.width != this.lastScreenWidth_ || screenSize.height != this.lastScreenHeight_) {
        this.resize();
        return
    }
    this.redraw_();
    this.publish("scroll", {scrollPort: this})
};
hterm.ScrollPort.prototype.onScrollWheel = function (e) {
};
hterm.ScrollPort.prototype.onScrollWheel_ = function (e) {
    this.onScrollWheel(e);
    if (e.defaultPrevented)return;
    var delta = e.type == "DOMMouseScroll" ? -1 * e.detail : e.wheelDeltaY;
    delta *= this.scrollWheelMultiplier_;
    var top = this.screen_.scrollTop - delta;
    if (top < 0)top = 0;
    var scrollMax = this.getScrollMax_();
    if (top > scrollMax)top = scrollMax;
    if (top != this.screen_.scrollTop) {
        this.screen_.scrollTop = top;
        e.preventDefault()
    }
};
hterm.ScrollPort.prototype.onResize_ = function (e) {
    this.syncCharacterSize();
    this.resize()
};
hterm.ScrollPort.prototype.onCopy = function (e) {
};
hterm.ScrollPort.prototype.onCopy_ = function (e) {
    this.onCopy(e);
    if (e.defaultPrevented)return;
    this.resetSelectBags_();
    this.selection.sync();
    if (!this.selection.startRow || this.selection.endRow.rowIndex - this.selection.startRow.rowIndex < 2)return;
    var topRowIndex = this.getTopRowIndex();
    var bottomRowIndex = this.getBottomRowIndex(topRowIndex);
    if (this.selection.startRow.rowIndex < topRowIndex) {
        var endBackfillIndex;
        if (this.selection.endRow.rowIndex < topRowIndex)endBackfillIndex = this.selection.endRow.rowIndex; else endBackfillIndex =
            this.topFold_.nextSibling.rowIndex;
        this.topSelectBag_.textContent = this.rowProvider_.getRowsText(this.selection.startRow.rowIndex + 1, endBackfillIndex);
        this.rowNodes_.insertBefore(this.topSelectBag_, this.selection.startRow.nextSibling);
        this.syncRowNodesDimensions_()
    }
    if (this.selection.endRow.rowIndex > bottomRowIndex) {
        var startBackfillIndex;
        if (this.selection.startRow.rowIndex > bottomRowIndex)startBackfillIndex = this.selection.startRow.rowIndex + 1; else startBackfillIndex = this.bottomFold_.previousSibling.rowIndex +
            1;
        this.bottomSelectBag_.textContent = this.rowProvider_.getRowsText(startBackfillIndex, this.selection.endRow.rowIndex);
        this.rowNodes_.insertBefore(this.bottomSelectBag_, this.selection.endRow)
    }
};
hterm.ScrollPort.prototype.onBodyKeyDown_ = function (e) {
    if (!this.ctrlVPaste)return;
    var key = String.fromCharCode(e.which);
    var lowerKey = key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && lowerKey == "v")this.pasteTarget_.focus()
};
hterm.ScrollPort.prototype.onPaste_ = function (e) {
    this.pasteTarget_.focus();
    var self = this;
    setTimeout(function () {
        self.publish("paste", {text: self.pasteTarget_.value});
        self.pasteTarget_.value = "";
        self.screen_.focus()
    }, 0)
};
hterm.ScrollPort.prototype.handlePasteTargetTextInput_ = function (e) {
    e.stopPropagation()
};
hterm.ScrollPort.prototype.setScrollbarVisible = function (state) {
    this.screen_.style.overflowY = state ? "scroll" : "hidden"
};
hterm.ScrollPort.prototype.setScrollWheelMoveMultipler = function (multiplier) {
    this.scrollWheelMultiplier_ = multiplier
};
"use strict";
lib.rtdep("lib.colors", "lib.PreferenceManager", "lib.resource", "lib.wc", "lib.f", "hterm.Keyboard", "hterm.Options", "hterm.PreferenceManager", "hterm.Screen", "hterm.ScrollPort", "hterm.Size", "hterm.TextAttributes", "hterm.VT");
hterm.Terminal = function (opt_profileId) {
    this.profileId_ = null;
    this.primaryScreen_ = new hterm.Screen;
    this.alternateScreen_ = new hterm.Screen;
    this.screen_ = this.primaryScreen_;
    this.screenSize = new hterm.Size(0, 0);
    this.scrollPort_ = new hterm.ScrollPort(this);
    this.scrollPort_.subscribe("resize", this.onResize_.bind(this));
    this.scrollPort_.subscribe("scroll", this.onScroll_.bind(this));
    this.scrollPort_.subscribe("paste", this.onPaste_.bind(this));
    this.scrollPort_.onCopy = this.onCopy_.bind(this);
    this.div_ = null;
    this.document_ =
        window.document;
    this.scrollbackRows_ = [];
    this.tabStops_ = [];
    this.defaultTabStops = true;
    this.vtScrollTop_ = null;
    this.vtScrollBottom_ = null;
    this.cursorNode_ = null;
    this.cursorShape_ = hterm.Terminal.cursorShape.BLOCK;
    this.cursorColor_ = null;
    this.cursorBlinkCycle_ = [100, 100];
    this.myOnCursorBlink_ = this.onCursorBlink_.bind(this);
    this.backgroundColor_ = null;
    this.foregroundColor_ = null;
    this.scrollOnOutput_ = null;
    this.scrollOnKeystroke_ = null;
    this.defeatMouseReports_ = false;
    this.bellAudio_ = this.document_.createElement("audio");
    this.bellAudio_.setAttribute("preload", "auto");
    this.bellNotificationList_ = [];
    this.desktopNotificationBell_ = false;
    this.savedOptions_ = {};
    this.options_ = new hterm.Options;
    this.timeouts_ = {};
    this.vt = new hterm.VT(this);
    this.keyboard = new hterm.Keyboard(this);
    this.io = new hterm.Terminal.IO(this);
    this.enableMouseDragScroll = true;
    this.copyOnSelect = null;
    this.mousePasteButton = null;
    this.useDefaultWindowCopy = false;
    this.clearSelectionAfterCopy = true;
    this.realizeSize_(80, 24);
    this.setDefaultTabStops();
    this.setProfile(opt_profileId ||
        "default", function () {
        this.onTerminalReady()
    }.bind(this))
};
hterm.Terminal.cursorShape = {BLOCK: "BLOCK", BEAM: "BEAM", UNDERLINE: "UNDERLINE"};
hterm.Terminal.prototype.onTerminalReady = function () {
};
hterm.Terminal.prototype.tabWidth = 8;
hterm.Terminal.prototype.setProfile = function (profileId, opt_callback) {
    this.profileId_ = profileId.replace(/\//g, "");
    var terminal = this;
    if (this.prefs_)this.prefs_.deactivate();
    this.prefs_ = new hterm.PreferenceManager(this.profileId_);
    this.prefs_.addObservers(null, {
        "alt-gr-mode": function (v) {
            if (v == null)if (navigator.language.toLowerCase() == "en-us")v = "none"; else v = "right-alt"; else if (typeof v == "string")v = v.toLowerCase(); else v = "none";
            if (!/^(none|ctrl-alt|left-alt|right-alt)$/.test(v))v = "none";
            terminal.keyboard.altGrMode =
                v
        }, "alt-backspace-is-meta-backspace": function (v) {
            terminal.keyboard.altBackspaceIsMetaBackspace = v
        }, "alt-is-meta": function (v) {
            terminal.keyboard.altIsMeta = v
        }, "alt-sends-what": function (v) {
            if (!/^(escape|8-bit|browser-key)$/.test(v))v = "escape";
            terminal.keyboard.altSendsWhat = v
        }, "audible-bell-sound": function (v) {
            var ary = v.match(/^lib-resource:(\S+)/);
            if (ary)terminal.bellAudio_.setAttribute("src", lib.resource.getDataUrl(ary[1])); else terminal.bellAudio_.setAttribute("src", v)
        }, "desktop-notification-bell": function (v) {
            if (v &&
                Notification) {
                terminal.desktopNotificationBell_ = Notification.permission === "granted";
                if (!terminal.desktopNotificationBell_)console.warn("desktop-notification-bell is true but we do not have " + "permission to display notifications.")
            } else terminal.desktopNotificationBell_ = false
        }, "background-color": function (v) {
            terminal.setBackgroundColor(v)
        }, "background-image": function (v) {
            terminal.scrollPort_.setBackgroundImage(v)
        }, "background-size": function (v) {
            terminal.scrollPort_.setBackgroundSize(v)
        }, "background-position": function (v) {
            terminal.scrollPort_.setBackgroundPosition(v)
        },
        "backspace-sends-backspace": function (v) {
            terminal.keyboard.backspaceSendsBackspace = v
        }, "character-map-overrides": function (v) {
            if (!(v == null || v instanceof Object)) {
                console.warn("Preference character-map-modifications is not an " + "object: " + v);
                return
            }
            for (var code in v) {
                var glmap = hterm.VT.CharacterMap.maps[code].glmap;
                for (var received in v[code])glmap[received] = v[code][received];
                hterm.VT.CharacterMap.maps[code].reset(glmap)
            }
        }, "cursor-blink": function (v) {
            terminal.setCursorBlink(!!v)
        }, "cursor-blink-cycle": function (v) {
            if (v instanceof Array && typeof v[0] == "number" && typeof v[1] == "number")terminal.cursorBlinkCycle_ = v; else if (typeof v == "number")terminal.cursorBlinkCycle_ = [v, v]; else terminal.cursorBlinkCycle_ = [100, 100]
        }, "cursor-color": function (v) {
            terminal.setCursorColor(v)
        }, "color-palette-overrides": function (v) {
            if (!(v == null || v instanceof Object || v instanceof Array)) {
                console.warn("Preference color-palette-overrides is not an array or " + "object: " + v);
                return
            }
            lib.colors.colorPalette = lib.colors.stockColorPalette.concat();
            if (v)for (var key in v) {
                var i =
                    parseInt(key);
                if (isNaN(i) || i < 0 || i > 255) {
                    console.log("Invalid value in palette: " + key + ": " + v[key]);
                    continue
                }
                if (v[i]) {
                    var rgb = lib.colors.normalizeCSS(v[i]);
                    if (rgb)lib.colors.colorPalette[i] = rgb
                }
            }
            terminal.primaryScreen_.textAttributes.resetColorPalette();
            terminal.alternateScreen_.textAttributes.resetColorPalette()
        }, "copy-on-select": function (v) {
            terminal.copyOnSelect = !!v
        }, "use-default-window-copy": function (v) {
            terminal.useDefaultWindowCopy = !!v
        }, "clear-selection-after-copy": function (v) {
            terminal.clearSelectionAfterCopy = !!v
        }, "ctrl-plus-minus-zero-zoom": function (v) {
            terminal.keyboard.ctrlPlusMinusZeroZoom = v
        }, "ctrl-c-copy": function (v) {
            terminal.keyboard.ctrlCCopy = v
        }, "ctrl-v-paste": function (v) {
            terminal.keyboard.ctrlVPaste = v;
            terminal.scrollPort_.setCtrlVPaste(v)
        }, "east-asian-ambiguous-as-two-column": function (v) {
            lib.wc.regardCjkAmbiguous = v
        }, "enable-8-bit-control": function (v) {
            terminal.vt.enable8BitControl = !!v
        }, "enable-bold": function (v) {
            terminal.syncBoldSafeState()
        }, "enable-bold-as-bright": function (v) {
            terminal.primaryScreen_.textAttributes.enableBoldAsBright = !!v;
            terminal.alternateScreen_.textAttributes.enableBoldAsBright = !!v
        }, "enable-clipboard-write": function (v) {
            terminal.vt.enableClipboardWrite = !!v
        }, "enable-dec12": function (v) {
            terminal.vt.enableDec12 = !!v
        }, "font-family": function (v) {
            terminal.syncFontFamily()
        }, "font-size": function (v) {
            terminal.setFontSize(v)
        }, "font-smoothing": function (v) {
            terminal.syncFontFamily()
        }, "foreground-color": function (v) {
            terminal.setForegroundColor(v)
        }, "home-keys-scroll": function (v) {
            terminal.keyboard.homeKeysScroll = v
        }, "keybindings": function (v) {
            terminal.keyboard.bindings.clear();
            if (!v)return;
            if (!(v instanceof Object)) {
                console.error("Error in keybindings preference: Expected object");
                return
            }
            try {
                terminal.keyboard.bindings.addBindings(v)
            } catch (ex) {
                console.error("Error in keybindings preference: " + ex)
            }
        }, "max-string-sequence": function (v) {
            terminal.vt.maxStringSequence = v
        }, "media-keys-are-fkeys": function (v) {
            terminal.keyboard.mediaKeysAreFKeys = v
        }, "meta-sends-escape": function (v) {
            terminal.keyboard.metaSendsEscape = v
        }, "mouse-paste-button": function (v) {
            terminal.syncMousePasteButton()
        },
        "page-keys-scroll": function (v) {
            terminal.keyboard.pageKeysScroll = v
        }, "pass-alt-number": function (v) {
            if (v == null) {
                var osx = window.navigator.userAgent.match(/Mac OS X/);
                v = !osx && hterm.windowType != "popup"
            }
            terminal.passAltNumber = v
        }, "pass-ctrl-number": function (v) {
            if (v == null) {
                var osx = window.navigator.userAgent.match(/Mac OS X/);
                v = !osx && hterm.windowType != "popup"
            }
            terminal.passCtrlNumber = v
        }, "pass-meta-number": function (v) {
            if (v == null) {
                var osx = window.navigator.userAgent.match(/Mac OS X/);
                v = osx && hterm.windowType != "popup"
            }
            terminal.passMetaNumber =
                v
        }, "pass-meta-v": function (v) {
            terminal.keyboard.passMetaV = v
        }, "receive-encoding": function (v) {
            if (!/^(utf-8|raw)$/.test(v)) {
                console.warn('Invalid value for "receive-encoding": ' + v);
                v = "utf-8"
            }
            terminal.vt.characterEncoding = v
        }, "scroll-on-keystroke": function (v) {
            terminal.scrollOnKeystroke_ = v
        }, "scroll-on-output": function (v) {
            terminal.scrollOnOutput_ = v
        }, "scrollbar-visible": function (v) {
            terminal.setScrollbarVisible(v)
        }, "scroll-wheel-move-multiplier": function (v) {
            terminal.setScrollWheelMoveMultipler(v)
        }, "send-encoding": function (v) {
            if (!/^(utf-8|raw)$/.test(v)) {
                console.warn('Invalid value for "send-encoding": ' +
                    v);
                v = "utf-8"
            }
            terminal.keyboard.characterEncoding = v
        }, "shift-insert-paste": function (v) {
            terminal.keyboard.shiftInsertPaste = v
        }, "user-css": function (v) {
            terminal.scrollPort_.setUserCss(v)
        }
    });
    this.prefs_.readStorage(function () {
        this.prefs_.notifyAll();
        if (opt_callback)opt_callback()
    }.bind(this))
};
hterm.Terminal.prototype.getPrefs = function () {
    return this.prefs_
};
hterm.Terminal.prototype.setBracketedPaste = function (state) {
    this.options_.bracketedPaste = state
};
hterm.Terminal.prototype.setCursorColor = function (color) {
    this.cursorColor_ = color;
    this.cursorNode_.style.backgroundColor = color;
    this.cursorNode_.style.borderColor = color
};
hterm.Terminal.prototype.getCursorColor = function () {
    return this.cursorColor_
};
hterm.Terminal.prototype.setSelectionEnabled = function (state) {
    this.enableMouseDragScroll = state
};
hterm.Terminal.prototype.setBackgroundColor = function (color) {
    this.backgroundColor_ = lib.colors.normalizeCSS(color);
    this.primaryScreen_.textAttributes.setDefaults(this.foregroundColor_, this.backgroundColor_);
    this.alternateScreen_.textAttributes.setDefaults(this.foregroundColor_, this.backgroundColor_);
    this.scrollPort_.setBackgroundColor(color)
};
hterm.Terminal.prototype.getBackgroundColor = function () {
    return this.backgroundColor_
};
hterm.Terminal.prototype.setForegroundColor = function (color) {
    this.foregroundColor_ = lib.colors.normalizeCSS(color);
    this.primaryScreen_.textAttributes.setDefaults(this.foregroundColor_, this.backgroundColor_);
    this.alternateScreen_.textAttributes.setDefaults(this.foregroundColor_, this.backgroundColor_);
    this.scrollPort_.setForegroundColor(color)
};
hterm.Terminal.prototype.getForegroundColor = function () {
    return this.foregroundColor_
};
hterm.Terminal.prototype.runCommandClass = function (commandClass, argString) {
    var environment = this.prefs_.get("environment");
    if (typeof environment != "object" || environment == null)environment = {};
    var self = this;
    this.argv = new commandClass({
        argString: argString || "",
        io: this.io.push(),
        environment: environment,
        onExit: function (code) {
            self.io.pop();
            self.uninstallKeyboard();
            if (self.prefs_.get("close-on-exit"))window.close()
        }
    });
    this.installKeyboard();
    this.argv.run()
};
hterm.Terminal.prototype.isPrimaryScreen = function () {
    return this.screen_ == this.primaryScreen_
};
hterm.Terminal.prototype.installKeyboard = function () {
    this.keyboard.installKeyboard(this.scrollPort_.getDocument().body)
};
hterm.Terminal.prototype.uninstallKeyboard = function () {
    this.keyboard.installKeyboard(null)
};
hterm.Terminal.prototype.setFontSize = function (px) {
    if (px === 0)px = this.prefs_.get("font-size");
    this.scrollPort_.setFontSize(px);
    if (this.wcCssRule_)this.wcCssRule_.style.width = this.scrollPort_.characterSize.width * 2 + "px"
};
hterm.Terminal.prototype.getFontSize = function () {
    return this.scrollPort_.getFontSize()
};
hterm.Terminal.prototype.getFontFamily = function () {
    return this.scrollPort_.getFontFamily()
};
hterm.Terminal.prototype.syncFontFamily = function () {
    this.scrollPort_.setFontFamily(this.prefs_.get("font-family"), this.prefs_.get("font-smoothing"));
    this.syncBoldSafeState()
};
hterm.Terminal.prototype.syncMousePasteButton = function () {
    var button = this.prefs_.get("mouse-paste-button");
    if (typeof button == "number") {
        this.mousePasteButton = button;
        return
    }
    var ary = navigator.userAgent.match(/\(X11;\s+(\S+)/);
    if (!ary || ary[2] == "CrOS")this.mousePasteButton = 2; else this.mousePasteButton = 3
};
hterm.Terminal.prototype.syncBoldSafeState = function () {
    var enableBold = this.prefs_.get("enable-bold");
    if (enableBold !== null) {
        this.primaryScreen_.textAttributes.enableBold = enableBold;
        this.alternateScreen_.textAttributes.enableBold = enableBold;
        return
    }
    var normalSize = this.scrollPort_.measureCharacterSize();
    var boldSize = this.scrollPort_.measureCharacterSize("bold");
    var isBoldSafe = normalSize.equals(boldSize);
    if (!isBoldSafe)console.warn("Bold characters disabled: Size of bold weight differs " + "from normal.  Font family is: " +
        this.scrollPort_.getFontFamily());
    this.primaryScreen_.textAttributes.enableBold = isBoldSafe;
    this.alternateScreen_.textAttributes.enableBold = isBoldSafe
};
hterm.Terminal.prototype.saveCursor = function () {
    return this.screen_.cursorPosition.clone()
};
hterm.Terminal.prototype.getTextAttributes = function () {
    return this.screen_.textAttributes
};
hterm.Terminal.prototype.setTextAttributes = function (textAttributes) {
    this.screen_.textAttributes = textAttributes
};
hterm.Terminal.prototype.getZoomFactor = function () {
    return this.scrollPort_.characterSize.zoomFactor
};
hterm.Terminal.prototype.setWindowTitle = function (title) {
    window.document.title = title
};
hterm.Terminal.prototype.restoreCursor = function (cursor) {
    var row = lib.f.clamp(cursor.row, 0, this.screenSize.height - 1);
    var column = lib.f.clamp(cursor.column, 0, this.screenSize.width - 1);
    this.screen_.setCursorPosition(row, column);
    if (cursor.column > column || cursor.column == column && cursor.overflow)this.screen_.cursorPosition.overflow = true
};
hterm.Terminal.prototype.clearCursorOverflow = function () {
    this.screen_.cursorPosition.overflow = false
};
hterm.Terminal.prototype.setCursorShape = function (shape) {
    this.cursorShape_ = shape;
    this.restyleCursor_()
};
hterm.Terminal.prototype.getCursorShape = function () {
    return this.cursorShape_
};
hterm.Terminal.prototype.setWidth = function (columnCount) {
    if (columnCount == null) {
        this.div_.style.width = "100%";
        return
    }
    this.div_.style.width = Math.ceil(this.scrollPort_.characterSize.width * columnCount + this.scrollPort_.currentScrollbarWidthPx) + "px";
    this.realizeSize_(columnCount, this.screenSize.height);
    this.scheduleSyncCursorPosition_()
};
hterm.Terminal.prototype.setHeight = function (rowCount) {
    if (rowCount == null) {
        this.div_.style.height = "100%";
        return
    }
    this.div_.style.height = this.scrollPort_.characterSize.height * rowCount + "px";
    this.realizeSize_(this.screenSize.width, rowCount);
    this.scheduleSyncCursorPosition_()
};
hterm.Terminal.prototype.realizeSize_ = function (columnCount, rowCount) {
    if (columnCount != this.screenSize.width)this.realizeWidth_(columnCount);
    if (rowCount != this.screenSize.height)this.realizeHeight_(rowCount);
    this.io.onTerminalResize_(columnCount, rowCount)
};
hterm.Terminal.prototype.realizeWidth_ = function (columnCount) {
    if (columnCount <= 0)throw new Error("Attempt to realize bad width: " + columnCount);
    var deltaColumns = columnCount - this.screen_.getWidth();
    this.screenSize.width = columnCount;
    this.screen_.setColumnCount(columnCount);
    if (deltaColumns > 0) {
        if (this.defaultTabStops)this.setDefaultTabStops(this.screenSize.width - deltaColumns)
    } else for (var i = this.tabStops_.length - 1; i >= 0; i--) {
        if (this.tabStops_[i] < columnCount)break;
        this.tabStops_.pop()
    }
    this.screen_.setColumnCount(this.screenSize.width)
};
hterm.Terminal.prototype.realizeHeight_ = function (rowCount) {
    if (rowCount <= 0)throw new Error("Attempt to realize bad height: " + rowCount);
    var deltaRows = rowCount - this.screen_.getHeight();
    this.screenSize.height = rowCount;
    var cursor = this.saveCursor();
    if (deltaRows < 0) {
        deltaRows *= -1;
        while (deltaRows) {
            var lastRow = this.getRowCount() - 1;
            if (lastRow - this.scrollbackRows_.length == cursor.row)break;
            if (this.getRowText(lastRow))break;
            this.screen_.popRow();
            deltaRows--
        }
        var ary = this.screen_.shiftRows(deltaRows);
        this.scrollbackRows_.push.apply(this.scrollbackRows_,
            ary);
        cursor.row = Math.max(cursor.row - deltaRows, 0)
    } else if (deltaRows > 0) {
        if (deltaRows <= this.scrollbackRows_.length) {
            var scrollbackCount = Math.min(deltaRows, this.scrollbackRows_.length);
            var rows = this.scrollbackRows_.splice(this.scrollbackRows_.length - scrollbackCount, scrollbackCount);
            this.screen_.unshiftRows(rows);
            deltaRows -= scrollbackCount;
            cursor.row += scrollbackCount
        }
        if (deltaRows)this.appendRows_(deltaRows)
    }
    this.setVTScrollRegion(null, null);
    this.restoreCursor(cursor)
};
hterm.Terminal.prototype.scrollHome = function () {
    this.scrollPort_.scrollRowToTop(0)
};
hterm.Terminal.prototype.scrollEnd = function () {
    this.scrollPort_.scrollRowToBottom(this.getRowCount())
};
hterm.Terminal.prototype.scrollPageUp = function () {
    var i = this.scrollPort_.getTopRowIndex();
    this.scrollPort_.scrollRowToTop(i - this.screenSize.height + 1)
};
hterm.Terminal.prototype.scrollPageDown = function () {
    var i = this.scrollPort_.getTopRowIndex();
    this.scrollPort_.scrollRowToTop(i + this.screenSize.height - 1)
};
hterm.Terminal.prototype.wipeContents = function () {
    this.scrollbackRows_.length = 0;
    this.scrollPort_.resetCache();
    [this.primaryScreen_, this.alternateScreen_].forEach(function (screen) {
        var bottom = screen.getHeight();
        if (bottom > 0) {
            this.renumberRows_(0, bottom);
            this.clearHome(screen)
        }
    }.bind(this));
    this.syncCursorPosition_();
    this.scrollPort_.invalidate()
};
hterm.Terminal.prototype.reset = function () {
    this.clearAllTabStops();
    this.setDefaultTabStops();
    this.clearHome(this.primaryScreen_);
    this.primaryScreen_.textAttributes.reset();
    this.clearHome(this.alternateScreen_);
    this.alternateScreen_.textAttributes.reset();
    this.setCursorBlink(!!this.prefs_.get("cursor-blink"));
    this.vt.reset();
    this.softReset()
};
hterm.Terminal.prototype.softReset = function () {
    this.options_ = new hterm.Options;
    this.options_.cursorBlink = !!this.timeouts_.cursorBlink;
    this.primaryScreen_.textAttributes.resetColorPalette();
    this.alternateScreen_.textAttributes.resetColorPalette();
    this.setVTScrollRegion(null, null);
    this.setCursorVisible(true)
};
hterm.Terminal.prototype.forwardTabStop = function () {
    var column = this.screen_.cursorPosition.column;
    for (var i = 0; i < this.tabStops_.length; i++)if (this.tabStops_[i] > column) {
        this.setCursorColumn(this.tabStops_[i]);
        return
    }
    var overflow = this.screen_.cursorPosition.overflow;
    this.setCursorColumn(this.screenSize.width - 1);
    this.screen_.cursorPosition.overflow = overflow
};
hterm.Terminal.prototype.backwardTabStop = function () {
    var column = this.screen_.cursorPosition.column;
    for (var i = this.tabStops_.length - 1; i >= 0; i--)if (this.tabStops_[i] < column) {
        this.setCursorColumn(this.tabStops_[i]);
        return
    }
    this.setCursorColumn(1)
};
hterm.Terminal.prototype.setTabStop = function (column) {
    for (var i = this.tabStops_.length - 1; i >= 0; i--) {
        if (this.tabStops_[i] == column)return;
        if (this.tabStops_[i] < column) {
            this.tabStops_.splice(i + 1, 0, column);
            return
        }
    }
    this.tabStops_.splice(0, 0, column)
};
hterm.Terminal.prototype.clearTabStopAtCursor = function () {
    var column = this.screen_.cursorPosition.column;
    var i = this.tabStops_.indexOf(column);
    if (i == -1)return;
    this.tabStops_.splice(i, 1)
};
hterm.Terminal.prototype.clearAllTabStops = function () {
    this.tabStops_.length = 0;
    this.defaultTabStops = false
};
hterm.Terminal.prototype.setDefaultTabStops = function (opt_start) {
    var start = opt_start || 0;
    var w = this.tabWidth;
    start = start - 1 - (start - 1) % w + w;
    for (var i = start; i < this.screenSize.width; i += w)this.setTabStop(i);
    this.defaultTabStops = true
};
hterm.Terminal.prototype.interpret = function (str) {
    this.vt.interpret(str);
    this.scheduleSyncCursorPosition_()
};
hterm.Terminal.prototype.decorate = function (div) {
    this.div_ = div;
    this.scrollPort_.decorate(div);
    this.scrollPort_.setBackgroundImage(this.prefs_.get("background-image"));
    this.scrollPort_.setBackgroundSize(this.prefs_.get("background-size"));
    this.scrollPort_.setBackgroundPosition(this.prefs_.get("background-position"));
    this.scrollPort_.setUserCss(this.prefs_.get("user-css"));
    this.div_.focus = this.focus.bind(this);
    this.setFontSize(this.prefs_.get("font-size"));
    this.syncFontFamily();
    this.setScrollbarVisible(this.prefs_.get("scrollbar-visible"));
    this.setScrollWheelMoveMultipler(this.prefs_.get("scroll-wheel-move-multiplier"));
    this.document_ = this.scrollPort_.getDocument();
    this.document_.body.oncontextmenu = function () {
        return false
    };
    var onMouse = this.onMouse_.bind(this);
    var screenNode = this.scrollPort_.getScreenNode();
    screenNode.addEventListener("mousedown", onMouse);
    screenNode.addEventListener("mouseup", onMouse);
    screenNode.addEventListener("mousemove", onMouse);
    this.scrollPort_.onScrollWheel = onMouse;
    screenNode.addEventListener("focus", this.onFocusChange_.bind(this,
        true));
    screenNode.addEventListener("mousedown", function () {
        setTimeout(this.onFocusChange_.bind(this, true))
    }.bind(this));
    screenNode.addEventListener("blur", this.onFocusChange_.bind(this, false));
    var style = this.document_.createElement("style");
    style.textContent = '.cursor-node[focus="false"] {' + "  box-sizing: border-box;" + "  background-color: transparent !important;" + "  border-width: 2px;" + "  border-style: solid;" + "}" + ".wc-node {" + "  display: inline-block;" + "  text-align: center;" + "  width: " + this.scrollPort_.characterSize.width *
        2 + "px;" + "}";
    this.document_.head.appendChild(style);
    var styleSheets = this.document_.styleSheets;
    var cssRules = styleSheets[styleSheets.length - 1].cssRules;
    this.wcCssRule_ = cssRules[cssRules.length - 1];
    this.cursorNode_ = this.document_.createElement("div");
    this.cursorNode_.className = "cursor-node";
    this.cursorNode_.style.cssText = "position: absolute;" + "top: -99px;" + "display: block;" + "width: " + this.scrollPort_.characterSize.width + "px;" + "height: " + this.scrollPort_.characterSize.height + "px;" + "-webkit-transition: opacity, background-color 100ms linear;" +
        "-moz-transition: opacity, background-color 100ms linear;";
    this.setCursorColor(this.prefs_.get("cursor-color"));
    this.setCursorBlink(!!this.prefs_.get("cursor-blink"));
    this.restyleCursor_();
    this.document_.body.appendChild(this.cursorNode_);
    this.scrollBlockerNode_ = this.document_.createElement("div");
    this.scrollBlockerNode_.style.cssText = "position: absolute;" + "top: -99px;" + "display: block;" + "width: 10px;" + "height: 10px;";
    this.document_.body.appendChild(this.scrollBlockerNode_);
    var onMouse = this.onMouse_.bind(this);
    this.scrollPort_.onScrollWheel = onMouse;
    ["mousedown", "mouseup", "mousemove", "click", "dblclick"].forEach(function (event) {
        this.scrollBlockerNode_.addEventListener(event, onMouse);
        this.cursorNode_.addEventListener(event, onMouse);
        this.document_.addEventListener(event, onMouse)
    }.bind(this));
    this.cursorNode_.addEventListener("mousedown", function () {
        setTimeout(this.focus.bind(this))
    }.bind(this));
    this.setReverseVideo(false);
    this.scrollPort_.focus();
    this.scrollPort_.scheduleRedraw()
};
hterm.Terminal.prototype.getDocument = function () {
    return this.document_
};
hterm.Terminal.prototype.focus = function () {
    this.scrollPort_.focus()
};
hterm.Terminal.prototype.getRowNode = function (index) {
    if (index < this.scrollbackRows_.length)return this.scrollbackRows_[index];
    var screenIndex = index - this.scrollbackRows_.length;
    return this.screen_.rowsArray[screenIndex]
};
hterm.Terminal.prototype.getRowsText = function (start, end) {
    var ary = [];
    for (var i = start; i < end; i++) {
        var node = this.getRowNode(i);
        ary.push(node.textContent);
        if (i < end - 1 && !node.getAttribute("line-overflow"))ary.push("\n")
    }
    return ary.join("")
};
hterm.Terminal.prototype.getRowText = function (index) {
    var node = this.getRowNode(index);
    return node.textContent
};
hterm.Terminal.prototype.getRowCount = function () {
    return this.scrollbackRows_.length + this.screen_.rowsArray.length
};
hterm.Terminal.prototype.appendRows_ = function (count) {
    var cursorRow = this.screen_.rowsArray.length;
    var offset = this.scrollbackRows_.length + cursorRow;
    for (var i = 0; i < count; i++) {
        var row = this.document_.createElement("x-row");
        row.appendChild(this.document_.createTextNode(""));
        row.rowIndex = offset + i;
        this.screen_.pushRow(row)
    }
    var extraRows = this.screen_.rowsArray.length - this.screenSize.height;
    if (extraRows > 0) {
        var ary = this.screen_.shiftRows(extraRows);
        Array.prototype.push.apply(this.scrollbackRows_, ary);
        if (this.scrollPort_.isScrolledEnd)this.scheduleScrollDown_()
    }
    if (cursorRow >=
        this.screen_.rowsArray.length)cursorRow = this.screen_.rowsArray.length - 1;
    this.setAbsoluteCursorPosition(cursorRow, 0)
};
hterm.Terminal.prototype.moveRows_ = function (fromIndex, count, toIndex) {
    var ary = this.screen_.removeRows(fromIndex, count);
    this.screen_.insertRows(toIndex, ary);
    var start, end;
    if (fromIndex < toIndex) {
        start = fromIndex;
        end = toIndex + count
    } else {
        start = toIndex;
        end = fromIndex + count
    }
    this.renumberRows_(start, end);
    this.scrollPort_.scheduleInvalidate()
};
hterm.Terminal.prototype.renumberRows_ = function (start, end, opt_screen) {
    var screen = opt_screen || this.screen_;
    var offset = this.scrollbackRows_.length;
    for (var i = start; i < end; i++)screen.rowsArray[i].rowIndex = offset + i
};
hterm.Terminal.prototype.print = function (str) {
    var startOffset = 0;
    var strWidth = lib.wc.strWidth(str);
    while (startOffset < strWidth) {
        if (this.options_.wraparound && this.screen_.cursorPosition.overflow) {
            this.screen_.commitLineOverflow();
            this.newLine()
        }
        var count = strWidth - startOffset;
        var didOverflow = false;
        var substr;
        if (this.screen_.cursorPosition.column + count >= this.screenSize.width) {
            didOverflow = true;
            count = this.screenSize.width - this.screen_.cursorPosition.column
        }
        if (didOverflow && !this.options_.wraparound) {
            substr =
                lib.wc.substr(str, startOffset, count - 1) + lib.wc.substr(str, strWidth - 1);
            count = strWidth
        } else substr = lib.wc.substr(str, startOffset, count);
        var tokens = hterm.TextAttributes.splitWidecharString(substr);
        for (var i = 0; i < tokens.length; i++) {
            if (tokens[i].wcNode)this.screen_.textAttributes.wcNode = true;
            if (this.options_.insertMode)this.screen_.insertString(tokens[i].str); else this.screen_.overwriteString(tokens[i].str);
            this.screen_.textAttributes.wcNode = false
        }
        this.screen_.maybeClipCurrentRow();
        startOffset += count
    }
    this.scheduleSyncCursorPosition_();
    if (this.scrollOnOutput_)this.scrollPort_.scrollRowToBottom(this.getRowCount())
};
hterm.Terminal.prototype.setVTScrollRegion = function (scrollTop, scrollBottom) {
    if (scrollTop == 0 && scrollBottom == this.screenSize.height - 1) {
        this.vtScrollTop_ = null;
        this.vtScrollBottom_ = null
    } else {
        this.vtScrollTop_ = scrollTop;
        this.vtScrollBottom_ = scrollBottom
    }
};
hterm.Terminal.prototype.getVTScrollTop = function () {
    if (this.vtScrollTop_ != null)return this.vtScrollTop_;
    return 0
};
hterm.Terminal.prototype.getVTScrollBottom = function () {
    if (this.vtScrollBottom_ != null)return this.vtScrollBottom_;
    return this.screenSize.height - 1
};
hterm.Terminal.prototype.newLine = function () {
    var cursorAtEndOfScreen = this.screen_.cursorPosition.row == this.screen_.rowsArray.length - 1;
    if (this.vtScrollBottom_ != null)if (this.screen_.cursorPosition.row == this.vtScrollBottom_) {
        this.vtScrollUp(1);
        this.setAbsoluteCursorPosition(this.screen_.cursorPosition.row, 0)
    } else if (cursorAtEndOfScreen)this.setAbsoluteCursorPosition(this.screen_.cursorPosition.row, 0); else this.setAbsoluteCursorPosition(this.screen_.cursorPosition.row + 1, 0); else if (cursorAtEndOfScreen)this.appendRows_(1);
    else this.setAbsoluteCursorPosition(this.screen_.cursorPosition.row + 1, 0)
};
hterm.Terminal.prototype.lineFeed = function () {
    var column = this.screen_.cursorPosition.column;
    this.newLine();
    this.setCursorColumn(column)
};
hterm.Terminal.prototype.formFeed = function () {
    if (this.options_.autoCarriageReturn)this.newLine(); else this.lineFeed()
};
hterm.Terminal.prototype.reverseLineFeed = function () {
    var scrollTop = this.getVTScrollTop();
    var currentRow = this.screen_.cursorPosition.row;
    if (currentRow == scrollTop)this.insertLines(1); else this.setAbsoluteCursorRow(currentRow - 1)
};
hterm.Terminal.prototype.eraseToLeft = function () {
    var cursor = this.saveCursor();
    this.setCursorColumn(0);
    this.screen_.overwriteString(lib.f.getWhitespace(cursor.column + 1));
    this.restoreCursor(cursor)
};
hterm.Terminal.prototype.eraseToRight = function (opt_count) {
    if (this.screen_.cursorPosition.overflow)return;
    var maxCount = this.screenSize.width - this.screen_.cursorPosition.column;
    var count = opt_count ? Math.min(opt_count, maxCount) : maxCount;
    if (this.screen_.textAttributes.background === this.screen_.textAttributes.DEFAULT_COLOR) {
        var cursorRow = this.screen_.rowsArray[this.screen_.cursorPosition.row];
        if (hterm.TextAttributes.nodeWidth(cursorRow) <= this.screen_.cursorPosition.column + count) {
            this.screen_.deleteChars(count);
            this.clearCursorOverflow();
            return
        }
    }
    var cursor = this.saveCursor();
    this.screen_.overwriteString(lib.f.getWhitespace(count));
    this.restoreCursor(cursor);
    this.clearCursorOverflow()
};
hterm.Terminal.prototype.eraseLine = function () {
    var cursor = this.saveCursor();
    this.screen_.clearCursorRow();
    this.restoreCursor(cursor);
    this.clearCursorOverflow()
};
hterm.Terminal.prototype.eraseAbove = function () {
    var cursor = this.saveCursor();
    this.eraseToLeft();
    for (var i = 0; i < cursor.row; i++) {
        this.setAbsoluteCursorPosition(i, 0);
        this.screen_.clearCursorRow()
    }
    this.restoreCursor(cursor);
    this.clearCursorOverflow()
};
hterm.Terminal.prototype.eraseBelow = function () {
    var cursor = this.saveCursor();
    this.eraseToRight();
    var bottom = this.screenSize.height - 1;
    for (var i = cursor.row + 1; i <= bottom; i++) {
        this.setAbsoluteCursorPosition(i, 0);
        this.screen_.clearCursorRow()
    }
    this.restoreCursor(cursor);
    this.clearCursorOverflow()
};
hterm.Terminal.prototype.fill = function (ch) {
    var cursor = this.saveCursor();
    this.setAbsoluteCursorPosition(0, 0);
    for (var row = 0; row < this.screenSize.height; row++)for (var col = 0; col < this.screenSize.width; col++) {
        this.setAbsoluteCursorPosition(row, col);
        this.screen_.overwriteString(ch)
    }
    this.restoreCursor(cursor)
};
hterm.Terminal.prototype.clearHome = function (opt_screen) {
    var screen = opt_screen || this.screen_;
    var bottom = screen.getHeight();
    if (bottom == 0)return;
    for (var i = 0; i < bottom; i++) {
        screen.setCursorPosition(i, 0);
        screen.clearCursorRow()
    }
    screen.setCursorPosition(0, 0)
};
hterm.Terminal.prototype.clear = function (opt_screen) {
    var screen = opt_screen || this.screen_;
    var cursor = screen.cursorPosition.clone();
    this.clearHome(screen);
    screen.setCursorPosition(cursor.row, cursor.column)
};
hterm.Terminal.prototype.insertLines = function (count) {
    var cursorRow = this.screen_.cursorPosition.row;
    var bottom = this.getVTScrollBottom();
    count = Math.min(count, bottom - cursorRow);
    var moveCount = bottom - cursorRow - count + 1;
    if (moveCount)this.moveRows_(cursorRow, moveCount, cursorRow + count);
    for (var i = count - 1; i >= 0; i--) {
        this.setAbsoluteCursorPosition(cursorRow + i, 0);
        this.screen_.clearCursorRow()
    }
};
hterm.Terminal.prototype.deleteLines = function (count) {
    var cursor = this.saveCursor();
    var top = cursor.row;
    var bottom = this.getVTScrollBottom();
    var maxCount = bottom - top + 1;
    count = Math.min(count, maxCount);
    var moveStart = bottom - count + 1;
    if (count != maxCount)this.moveRows_(top, count, moveStart);
    for (var i = 0; i < count; i++) {
        this.setAbsoluteCursorPosition(moveStart + i, 0);
        this.screen_.clearCursorRow()
    }
    this.restoreCursor(cursor);
    this.clearCursorOverflow()
};
hterm.Terminal.prototype.insertSpace = function (count) {
    var cursor = this.saveCursor();
    var ws = lib.f.getWhitespace(count || 1);
    this.screen_.insertString(ws);
    this.screen_.maybeClipCurrentRow();
    this.restoreCursor(cursor);
    this.clearCursorOverflow()
};
hterm.Terminal.prototype.deleteChars = function (count) {
    var deleted = this.screen_.deleteChars(count);
    if (deleted && !this.screen_.textAttributes.isDefault()) {
        var cursor = this.saveCursor();
        this.setCursorColumn(this.screenSize.width - deleted);
        this.screen_.insertString(lib.f.getWhitespace(deleted));
        this.restoreCursor(cursor)
    }
    this.clearCursorOverflow()
};
hterm.Terminal.prototype.vtScrollUp = function (count) {
    var cursor = this.saveCursor();
    this.setAbsoluteCursorRow(this.getVTScrollTop());
    this.deleteLines(count);
    this.restoreCursor(cursor)
};
hterm.Terminal.prototype.vtScrollDown = function (opt_count) {
    var cursor = this.saveCursor();
    this.setAbsoluteCursorPosition(this.getVTScrollTop(), 0);
    this.insertLines(opt_count);
    this.restoreCursor(cursor)
};
hterm.Terminal.prototype.setCursorPosition = function (row, column) {
    if (this.options_.originMode)this.setRelativeCursorPosition(row, column); else this.setAbsoluteCursorPosition(row, column)
};
hterm.Terminal.prototype.setRelativeCursorPosition = function (row, column) {
    var scrollTop = this.getVTScrollTop();
    row = lib.f.clamp(row + scrollTop, scrollTop, this.getVTScrollBottom());
    column = lib.f.clamp(column, 0, this.screenSize.width - 1);
    this.screen_.setCursorPosition(row, column)
};
hterm.Terminal.prototype.setAbsoluteCursorPosition = function (row, column) {
    row = lib.f.clamp(row, 0, this.screenSize.height - 1);
    column = lib.f.clamp(column, 0, this.screenSize.width - 1);
    this.screen_.setCursorPosition(row, column)
};
hterm.Terminal.prototype.setCursorColumn = function (column) {
    this.setAbsoluteCursorPosition(this.screen_.cursorPosition.row, column)
};
hterm.Terminal.prototype.getCursorColumn = function () {
    return this.screen_.cursorPosition.column
};
hterm.Terminal.prototype.setAbsoluteCursorRow = function (row) {
    this.setAbsoluteCursorPosition(row, this.screen_.cursorPosition.column)
};
hterm.Terminal.prototype.getCursorRow = function (row) {
    return this.screen_.cursorPosition.row
};
hterm.Terminal.prototype.scheduleRedraw_ = function () {
    if (this.timeouts_.redraw)return;
    var self = this;
    this.timeouts_.redraw = setTimeout(function () {
        delete self.timeouts_.redraw;
        self.scrollPort_.redraw_()
    }, 0)
};
hterm.Terminal.prototype.scheduleScrollDown_ = function () {
    if (this.timeouts_.scrollDown)return;
    var self = this;
    this.timeouts_.scrollDown = setTimeout(function () {
        delete self.timeouts_.scrollDown;
        self.scrollPort_.scrollRowToBottom(self.getRowCount())
    }, 10)
};
hterm.Terminal.prototype.cursorUp = function (count) {
    return this.cursorDown(-(count || 1))
};
hterm.Terminal.prototype.cursorDown = function (count) {
    count = count || 1;
    var minHeight = this.options_.originMode ? this.getVTScrollTop() : 0;
    var maxHeight = this.options_.originMode ? this.getVTScrollBottom() : this.screenSize.height - 1;
    var row = lib.f.clamp(this.screen_.cursorPosition.row + count, minHeight, maxHeight);
    this.setAbsoluteCursorRow(row)
};
hterm.Terminal.prototype.cursorLeft = function (count) {
    count = count || 1;
    if (count < 1)return;
    var currentColumn = this.screen_.cursorPosition.column;
    if (this.options_.reverseWraparound) {
        if (this.screen_.cursorPosition.overflow) {
            count--;
            this.clearCursorOverflow();
            if (!count)return
        }
        var newRow = this.screen_.cursorPosition.row;
        var newColumn = currentColumn - count;
        if (newColumn < 0) {
            newRow = newRow - Math.floor(count / this.screenSize.width) - 1;
            if (newRow < 0)newRow = this.screenSize.height + newRow % this.screenSize.height;
            newColumn = this.screenSize.width +
                newColumn % this.screenSize.width
        }
        this.setCursorPosition(Math.max(newRow, 0), newColumn)
    } else {
        var newColumn = Math.max(currentColumn - count, 0);
        this.setCursorColumn(newColumn)
    }
};
hterm.Terminal.prototype.cursorRight = function (count) {
    count = count || 1;
    if (count < 1)return;
    var column = lib.f.clamp(this.screen_.cursorPosition.column + count, 0, this.screenSize.width - 1);
    this.setCursorColumn(column)
};
hterm.Terminal.prototype.setReverseVideo = function (state) {
    this.options_.reverseVideo = state;
    if (state) {
        this.scrollPort_.setForegroundColor(this.prefs_.get("background-color"));
        this.scrollPort_.setBackgroundColor(this.prefs_.get("foreground-color"))
    } else {
        this.scrollPort_.setForegroundColor(this.prefs_.get("foreground-color"));
        this.scrollPort_.setBackgroundColor(this.prefs_.get("background-color"))
    }
};
hterm.Terminal.prototype.ringBell = function () {
    this.cursorNode_.style.backgroundColor = this.scrollPort_.getForegroundColor();
    var self = this;
    setTimeout(function () {
        self.cursorNode_.style.backgroundColor = self.prefs_.get("cursor-color")
    }, 200);
    if (this.bellSquelchTimeout_)return;
    if (this.bellAudio_.getAttribute("src")) {
        this.bellAudio_.play();
        this.bellSequelchTimeout_ = setTimeout(function () {
            delete this.bellSquelchTimeout_
        }.bind(this), 500)
    } else delete this.bellSquelchTimeout_;
    if (this.desktopNotificationBell_ && !this.document_.hasFocus()) {
        var n = new Notification(lib.f.replaceVars(hterm.desktopNotificationTitle, {"title": window.document.title || "hterm"}));
        this.bellNotificationList_.push(n);
        n.onclick = function () {
            self.closeBellNotifications_()
        }
    }
};
hterm.Terminal.prototype.setOriginMode = function (state) {
    this.options_.originMode = state;
    this.setCursorPosition(0, 0)
};
hterm.Terminal.prototype.setInsertMode = function (state) {
    this.options_.insertMode = state
};
hterm.Terminal.prototype.setAutoCarriageReturn = function (state) {
    this.options_.autoCarriageReturn = state
};
hterm.Terminal.prototype.setWraparound = function (state) {
    this.options_.wraparound = state
};
hterm.Terminal.prototype.setReverseWraparound = function (state) {
    this.options_.reverseWraparound = state
};
hterm.Terminal.prototype.setAlternateMode = function (state) {
    var cursor = this.saveCursor();
    this.screen_ = state ? this.alternateScreen_ : this.primaryScreen_;
    if (this.screen_.rowsArray.length && this.screen_.rowsArray[0].rowIndex != this.scrollbackRows_.length) {
        var offset = this.scrollbackRows_.length;
        var ary = this.screen_.rowsArray;
        for (var i = 0; i < ary.length; i++)ary[i].rowIndex = offset + i
    }
    this.realizeWidth_(this.screenSize.width);
    this.realizeHeight_(this.screenSize.height);
    this.scrollPort_.syncScrollHeight();
    this.scrollPort_.invalidate();
    this.restoreCursor(cursor);
    this.scrollPort_.resize()
};
hterm.Terminal.prototype.setCursorBlink = function (state) {
    this.options_.cursorBlink = state;
    if (!state && this.timeouts_.cursorBlink) {
        clearTimeout(this.timeouts_.cursorBlink);
        delete this.timeouts_.cursorBlink
    }
    if (this.options_.cursorVisible)this.setCursorVisible(true)
};
hterm.Terminal.prototype.setCursorVisible = function (state) {
    this.options_.cursorVisible = state;
    if (!state) {
        if (this.timeouts_.cursorBlink) {
            clearTimeout(this.timeouts_.cursorBlink);
            delete this.timeouts_.cursorBlink
        }
        this.cursorNode_.style.opacity = "0";
        return
    }
    this.syncCursorPosition_();
    this.cursorNode_.style.opacity = "1";
    if (this.options_.cursorBlink) {
        if (this.timeouts_.cursorBlink)return;
        this.onCursorBlink_()
    } else if (this.timeouts_.cursorBlink) {
        clearTimeout(this.timeouts_.cursorBlink);
        delete this.timeouts_.cursorBlink
    }
};
hterm.Terminal.prototype.syncCursorPosition_ = function () {
    var topRowIndex = this.scrollPort_.getTopRowIndex();
    var bottomRowIndex = this.scrollPort_.getBottomRowIndex(topRowIndex);
    var cursorRowIndex = this.scrollbackRows_.length + this.screen_.cursorPosition.row;
    if (cursorRowIndex > bottomRowIndex) {
        this.cursorNode_.style.top = -this.scrollPort_.characterSize.height + "px";
        return
    }
    if (this.options_.cursorVisible && this.cursorNode_.style.display == "none")this.cursorNode_.style.display = "";
    this.cursorNode_.style.top = this.scrollPort_.visibleRowTopMargin +
        this.scrollPort_.characterSize.height * (cursorRowIndex - topRowIndex) + "px";
    this.cursorNode_.style.left = this.scrollPort_.characterSize.width * this.screen_.cursorPosition.column + "px";
    this.cursorNode_.setAttribute("title", "(" + this.screen_.cursorPosition.row + ", " + this.screen_.cursorPosition.column + ")");
    var selection = this.document_.getSelection();
    if (selection && selection.isCollapsed)this.screen_.syncSelectionCaret(selection)
};
hterm.Terminal.prototype.restyleCursor_ = function () {
    var shape = this.cursorShape_;
    if (this.cursorNode_.getAttribute("focus") == "false")shape = hterm.Terminal.cursorShape.BLOCK;
    var style = this.cursorNode_.style;
    style.width = this.scrollPort_.characterSize.width + "px";
    switch (shape) {
        case hterm.Terminal.cursorShape.BEAM:
            style.height = this.scrollPort_.characterSize.height + "px";
            style.backgroundColor = "transparent";
            style.borderBottomStyle = null;
            style.borderLeftStyle = "solid";
            break;
        case hterm.Terminal.cursorShape.UNDERLINE:
            style.height =
                this.scrollPort_.characterSize.baseline + "px";
            style.backgroundColor = "transparent";
            style.borderBottomStyle = "solid";
            style.borderLeftStyle = null;
            break;
        default:
            style.height = this.scrollPort_.characterSize.height + "px";
            style.backgroundColor = this.cursorColor_;
            style.borderBottomStyle = null;
            style.borderLeftStyle = null;
            break
    }
};
hterm.Terminal.prototype.scheduleSyncCursorPosition_ = function () {
    if (this.timeouts_.syncCursor)return;
    var self = this;
    this.timeouts_.syncCursor = setTimeout(function () {
        self.syncCursorPosition_();
        delete self.timeouts_.syncCursor
    }, 0)
};
hterm.Terminal.prototype.showZoomWarning_ = function (state) {
    if (!this.zoomWarningNode_) {
        if (!state)return;
        this.zoomWarningNode_ = this.document_.createElement("div");
        this.zoomWarningNode_.style.cssText = "color: black;" + "background-color: #ff2222;" + "font-size: large;" + "border-radius: 8px;" + "opacity: 0.75;" + "padding: 0.2em 0.5em 0.2em 0.5em;" + "top: 0.5em;" + "right: 1.2em;" + "position: absolute;" + "-webkit-text-size-adjust: none;" + "-webkit-user-select: none;" + "-moz-text-size-adjust: none;" + "-moz-user-select: none;";
        this.zoomWarningNode_.addEventListener("click", function (e) {
            this.parentNode.removeChild(this)
        })
    }
    this.zoomWarningNode_.textContent = lib.MessageManager.replaceReferences(hterm.zoomWarningMessage, [parseInt(this.scrollPort_.characterSize.zoomFactor * 100)]);
    this.zoomWarningNode_.style.fontFamily = this.prefs_.get("font-family");
    if (state) {
        if (!this.zoomWarningNode_.parentNode)this.div_.parentNode.appendChild(this.zoomWarningNode_)
    } else if (this.zoomWarningNode_.parentNode)this.zoomWarningNode_.parentNode.removeChild(this.zoomWarningNode_)
};
hterm.Terminal.prototype.showOverlay = function (msg, opt_timeout) {
    if (!this.overlayNode_) {
        if (!this.div_)return;
        this.overlayNode_ = this.document_.createElement("div");
        this.overlayNode_.style.cssText = "border-radius: 15px;" + "font-size: xx-large;" + "opacity: 0.75;" + "padding: 0.2em 0.5em 0.2em 0.5em;" + "position: absolute;" + "-webkit-user-select: none;" + "-webkit-transition: opacity 180ms ease-in;" + "-moz-user-select: none;" + "-moz-transition: opacity 180ms ease-in;";
        this.overlayNode_.addEventListener("mousedown",
            function (e) {
                e.preventDefault();
                e.stopPropagation()
            }, true)
    }
    this.overlayNode_.style.color = this.prefs_.get("background-color");
    this.overlayNode_.style.backgroundColor = this.prefs_.get("foreground-color");
    this.overlayNode_.style.fontFamily = this.prefs_.get("font-family");
    this.overlayNode_.textContent = msg;
    this.overlayNode_.style.opacity = "0.75";
    if (!this.overlayNode_.parentNode)this.div_.appendChild(this.overlayNode_);
    var divSize = hterm.getClientSize(this.div_);
    var overlaySize = hterm.getClientSize(this.overlayNode_);
    this.overlayNode_.style.top = (divSize.height - overlaySize.height) / 2 + "px";
    this.overlayNode_.style.left = (divSize.width - overlaySize.width - this.scrollPort_.currentScrollbarWidthPx) / 2 + "px";
    var self = this;
    if (this.overlayTimeout_)clearTimeout(this.overlayTimeout_);
    if (opt_timeout === null)return;
    this.overlayTimeout_ = setTimeout(function () {
        self.overlayNode_.style.opacity = "0";
        self.overlayTimeout_ = setTimeout(function () {
            if (self.overlayNode_.parentNode)self.overlayNode_.parentNode.removeChild(self.overlayNode_);
            self.overlayTimeout_ =
                null;
            self.overlayNode_.style.opacity = "0.75"
        }, 200)
    }, opt_timeout || 1500)
};
hterm.Terminal.prototype.paste = function () {
    hterm.pasteFromClipboard(this.document_)
};
hterm.Terminal.prototype.copyStringToClipboard = function (str) {
    if (this.prefs_.get("enable-clipboard-notice"))setTimeout(this.showOverlay.bind(this, hterm.notifyCopyMessage, 500), 200);
    var copySource = this.document_.createElement("pre");
    copySource.textContent = str;
    copySource.style.cssText = "-webkit-user-select: text;" + "-moz-user-select: text;" + "position: absolute;" + "top: -99px";
    this.document_.body.appendChild(copySource);
    var selection = this.document_.getSelection();
    var anchorNode = selection.anchorNode;
    var anchorOffset =
        selection.anchorOffset;
    var focusNode = selection.focusNode;
    var focusOffset = selection.focusOffset;
    selection.selectAllChildren(copySource);
    hterm.copySelectionToClipboard(this.document_);
    if (selection.extend) {
        selection.collapse(anchorNode, anchorOffset);
        selection.extend(focusNode, focusOffset)
    }
    copySource.parentNode.removeChild(copySource)
};
hterm.Terminal.prototype.getSelectionText = function () {
    var selection = this.scrollPort_.selection;
    selection.sync();
    if (selection.isCollapsed)return null;
    var startOffset = selection.startOffset;
    var node = selection.startNode;
    if (node.nodeName != "X-ROW") {
        if (node.nodeName == "#text" && node.parentNode.nodeName == "SPAN")node = node.parentNode;
        while (node.previousSibling) {
            node = node.previousSibling;
            startOffset += hterm.TextAttributes.nodeWidth(node)
        }
    }
    var endOffset = hterm.TextAttributes.nodeWidth(selection.endNode) - selection.endOffset;
    var node = selection.endNode;
    if (node.nodeName != "X-ROW") {
        if (node.nodeName == "#text" && node.parentNode.nodeName == "SPAN")node = node.parentNode;
        while (node.nextSibling) {
            node = node.nextSibling;
            endOffset += hterm.TextAttributes.nodeWidth(node)
        }
    }
    var rv = this.getRowsText(selection.startRow.rowIndex, selection.endRow.rowIndex + 1);
    return lib.wc.substring(rv, startOffset, lib.wc.strWidth(rv) - endOffset)
};
hterm.Terminal.prototype.copySelectionToClipboard = function () {
    var text = this.getSelectionText();
    if (text != null)this.copyStringToClipboard(text)
};
hterm.Terminal.prototype.overlaySize = function () {
    this.showOverlay(this.screenSize.width + "x" + this.screenSize.height)
};
hterm.Terminal.prototype.onVTKeystroke = function (string) {
    if (this.scrollOnKeystroke_)this.scrollPort_.scrollRowToBottom(this.getRowCount());
    this.io.onVTKeystroke(this.keyboard.encode(string))
};
hterm.Terminal.prototype.onMouse_ = function (e) {
    if (e.processedByTerminalHandler_)return;
    var reportMouseEvents = !this.defeatMouseReports_ && this.vt.mouseReport != this.vt.MOUSE_REPORT_DISABLED;
    e.processedByTerminalHandler_ = true;
    e.terminalRow = parseInt((e.clientY - this.scrollPort_.visibleRowTopMargin) / this.scrollPort_.characterSize.height) + 1;
    e.terminalColumn = parseInt(e.clientX / this.scrollPort_.characterSize.width) + 1;
    if (e.type == "mousedown" && e.terminalColumn > this.screenSize.width)return;
    if (this.options_.cursorVisible && !reportMouseEvents)if (e.terminalRow - 1 == this.screen_.cursorPosition.row && e.terminalColumn - 1 == this.screen_.cursorPosition.column)this.cursorNode_.style.display = "none"; else if (this.cursorNode_.style.display == "none")this.cursorNode_.style.display = "";
    if (e.type == "mousedown")if (e.altKey || !reportMouseEvents) {
        this.defeatMouseReports_ = true;
        this.setSelectionEnabled(true)
    } else {
        this.defeatMouseReports_ = false;
        this.document_.getSelection().collapseToEnd();
        this.setSelectionEnabled(false);
        e.preventDefault()
    }
    if (!reportMouseEvents) {
        if (e.type ==
            "dblclick" && this.copyOnSelect) {
            this.screen_.expandSelection(this.document_.getSelection());
            this.copySelectionToClipboard(this.document_)
        }
        if (e.type == "mousedown" && e.which == this.mousePasteButton)this.paste();
        if (e.type == "mouseup" && e.which == 1 && this.copyOnSelect && !this.document_.getSelection().isCollapsed)this.copySelectionToClipboard(this.document_);
        if ((e.type == "mousemove" || e.type == "mouseup") && this.scrollBlockerNode_.engaged) {
            this.scrollBlockerNode_.engaged = false;
            this.scrollBlockerNode_.style.top = "-99px"
        }
    } else {
        if (!this.scrollBlockerNode_.engaged)if (e.type ==
            "mousedown") {
            this.scrollBlockerNode_.engaged = true;
            this.scrollBlockerNode_.style.top = e.clientY - 5 + "px";
            this.scrollBlockerNode_.style.left = e.clientX - 5 + "px"
        } else if (e.type == "mousemove") {
            this.document_.getSelection().collapseToEnd();
            e.preventDefault()
        }
        this.onMouse(e)
    }
    if (e.type == "mouseup" && this.document_.getSelection().isCollapsed)this.defeatMouseReports_ = false
};
hterm.Terminal.prototype.onMouse = function (e) {
};
hterm.Terminal.prototype.onFocusChange_ = function (focused) {
    this.cursorNode_.setAttribute("focus", focused);
    this.restyleCursor_();
    if (focused === true)this.closeBellNotifications_()
};
hterm.Terminal.prototype.onScroll_ = function () {
    this.scheduleSyncCursorPosition_()
};
hterm.Terminal.prototype.onPaste_ = function (e) {
    var data = e.text.replace(/\n/mg, "\r");
    data = this.keyboard.encode(data);
    if (this.options_.bracketedPaste)data = "\u001b[200~" + data + "\u001b[201~";
    this.io.sendString(data)
};
hterm.Terminal.prototype.onCopy_ = function (e) {
    if (!this.useDefaultWindowCopy) {
        e.preventDefault();
        setTimeout(this.copySelectionToClipboard.bind(this), 0)
    }
};
hterm.Terminal.prototype.onResize_ = function () {
    var columnCount = Math.floor(this.scrollPort_.getScreenWidth() / this.scrollPort_.characterSize.width) || 0;
    var rowCount = lib.f.smartFloorDivide(this.scrollPort_.getScreenHeight(), this.scrollPort_.characterSize.height) || 0;
    if (columnCount <= 0 || rowCount <= 0)return;
    var isNewSize = columnCount != this.screenSize.width || rowCount != this.screenSize.height;
    this.realizeSize_(columnCount, rowCount);
    this.showZoomWarning_(this.scrollPort_.characterSize.zoomFactor != 1);
    if (isNewSize)this.overlaySize();
    this.restyleCursor_();
    this.scheduleSyncCursorPosition_()
};
hterm.Terminal.prototype.onCursorBlink_ = function () {
    if (!this.options_.cursorBlink) {
        delete this.timeouts_.cursorBlink;
        return
    }
    if (this.cursorNode_.getAttribute("focus") == "false" || this.cursorNode_.style.opacity == "0") {
        this.cursorNode_.style.opacity = "1";
        this.timeouts_.cursorBlink = setTimeout(this.myOnCursorBlink_, this.cursorBlinkCycle_[0])
    } else {
        this.cursorNode_.style.opacity = "0";
        this.timeouts_.cursorBlink = setTimeout(this.myOnCursorBlink_, this.cursorBlinkCycle_[1])
    }
};
hterm.Terminal.prototype.setScrollbarVisible = function (state) {
    this.scrollPort_.setScrollbarVisible(state)
};
hterm.Terminal.prototype.setScrollWheelMoveMultipler = function (multiplier) {
    this.scrollPort_.setScrollWheelMoveMultipler(multiplier)
};
hterm.Terminal.prototype.closeBellNotifications_ = function () {
    this.bellNotificationList_.forEach(function (n) {
        n.close()
    });
    this.bellNotificationList_.length = 0
};
"use strict";
lib.rtdep("lib.encodeUTF8");
hterm.Terminal.IO = function (terminal) {
    this.terminal_ = terminal;
    this.previousIO_ = null
};
hterm.Terminal.IO.prototype.showOverlay = function (message, opt_timeout) {
    this.terminal_.showOverlay(message, opt_timeout)
};
hterm.Terminal.IO.prototype.createFrame = function (url, opt_options) {
    return new hterm.Frame(this.terminal_, url, opt_options)
};
hterm.Terminal.IO.prototype.setTerminalProfile = function (profileName) {
    this.terminal_.setProfile(profileName)
};
hterm.Terminal.IO.prototype.push = function () {
    var io = new hterm.Terminal.IO(this.terminal_);
    io.keyboardCaptured_ = this.keyboardCaptured_;
    io.columnCount = this.columnCount;
    io.rowCount = this.rowCount;
    io.previousIO_ = this.terminal_.io;
    this.terminal_.io = io;
    return io
};
hterm.Terminal.IO.prototype.pop = function () {
    this.terminal_.io = this.previousIO_
};
hterm.Terminal.IO.prototype.sendString = function (string) {
    console.log("Unhandled sendString: " + string)
};
hterm.Terminal.IO.prototype.onVTKeystroke = function (string) {
    console.log("Unobserverd VT keystroke: " + JSON.stringify(string))
};
hterm.Terminal.IO.prototype.onTerminalResize_ = function (width, height) {
    var obj = this;
    while (obj) {
        obj.columnCount = width;
        obj.rowCount = height;
        obj = obj.previousIO_
    }
    this.onTerminalResize(width, height)
};
hterm.Terminal.IO.prototype.onTerminalResize = function (width, height) {
};
hterm.Terminal.IO.prototype.writeUTF8 = function (string) {
    if (this.terminal_.io != this)throw"Attempt to print from inactive IO object.";
    this.terminal_.interpret(string)
};
hterm.Terminal.IO.prototype.writelnUTF8 = function (string) {
    if (this.terminal_.io != this)throw"Attempt to print from inactive IO object.";
    this.terminal_.interpret(string + "\r\n")
};
hterm.Terminal.IO.prototype.print = hterm.Terminal.IO.prototype.writeUTF16 = function (string) {
    this.writeUTF8(lib.encodeUTF8(string))
};
hterm.Terminal.IO.prototype.println = hterm.Terminal.IO.prototype.writelnUTF16 = function (string) {
    this.writelnUTF8(lib.encodeUTF8(string))
};
"use strict";
lib.rtdep("lib.colors");
hterm.TextAttributes = function (document) {
    this.document_ = document;
    this.foregroundSource = this.SRC_DEFAULT;
    this.backgroundSource = this.SRC_DEFAULT;
    this.foreground = this.DEFAULT_COLOR;
    this.background = this.DEFAULT_COLOR;
    this.defaultForeground = "rgb(255, 255, 255)";
    this.defaultBackground = "rgb(0, 0, 0)";
    this.bold = false;
    this.faint = false;
    this.italic = false;
    this.blink = false;
    this.underline = false;
    this.strikethrough = false;
    this.inverse = false;
    this.invisible = false;
    this.wcNode = false;
    this.tileData = null;
    this.colorPalette =
        null;
    this.resetColorPalette()
};
hterm.TextAttributes.prototype.enableBold = true;
hterm.TextAttributes.prototype.enableBoldAsBright = true;
hterm.TextAttributes.prototype.DEFAULT_COLOR = new String("");
hterm.TextAttributes.prototype.SRC_DEFAULT = "default";
hterm.TextAttributes.prototype.SRC_RGB = "rgb";
hterm.TextAttributes.prototype.setDocument = function (document) {
    this.document_ = document
};
hterm.TextAttributes.prototype.clone = function () {
    var rv = new hterm.TextAttributes(null);
    for (var key in this)rv[key] = this[key];
    rv.colorPalette = this.colorPalette.concat();
    return rv
};
hterm.TextAttributes.prototype.reset = function () {
    this.foregroundSource = this.SRC_DEFAULT;
    this.backgroundSource = this.SRC_DEFAULT;
    this.foreground = this.DEFAULT_COLOR;
    this.background = this.DEFAULT_COLOR;
    this.bold = false;
    this.faint = false;
    this.italic = false;
    this.blink = false;
    this.underline = false;
    this.strikethrough = false;
    this.inverse = false;
    this.invisible = false;
    this.wcNode = false
};
hterm.TextAttributes.prototype.resetColorPalette = function () {
    this.colorPalette = lib.colors.colorPalette.concat();
    this.syncColors()
};
hterm.TextAttributes.prototype.isDefault = function () {
    return this.foregroundSource == this.SRC_DEFAULT && this.backgroundSource == this.SRC_DEFAULT && !this.bold && !this.faint && !this.italic && !this.blink && !this.underline && !this.strikethrough && !this.inverse && !this.invisible && !this.wcNode && this.tileData == null
};
hterm.TextAttributes.prototype.createContainer = function (opt_textContent) {
    if (this.isDefault())return this.document_.createTextNode(opt_textContent);
    var span = this.document_.createElement("span");
    var style = span.style;
    if (this.foreground != this.DEFAULT_COLOR)style.color = this.foreground;
    if (this.background != this.DEFAULT_COLOR)style.backgroundColor = this.background;
    if (this.enableBold && this.bold)style.fontWeight = "bold";
    if (this.faint)span.faint = true;
    if (this.italic)style.fontStyle = "italic";
    if (this.blink)style.fontStyle =
        "italic";
    var textDecoration = "";
    if (this.underline) {
        textDecoration += " underline";
        span.underline = true
    }
    if (this.strikethrough) {
        textDecoration += " line-through";
        span.strikethrough = true
    }
    if (textDecoration)style.textDecoration = textDecoration;
    if (this.wcNode) {
        span.className = "wc-node";
        span.wcNode = true
    }
    if (this.tileData != null) {
        span.className += " tile tile_" + this.tileData;
        span.tileNode = true
    }
    if (opt_textContent)span.textContent = opt_textContent;
    return span
};
hterm.TextAttributes.prototype.matchesContainer = function (obj) {
    if (typeof obj == "string" || obj.nodeType == 3)return this.isDefault();
    var style = obj.style;
    return !(this.wcNode || obj.wcNode) && !(this.tileData != null || obj.tileNode) && this.foreground == style.color && this.background == style.backgroundColor && (this.enableBold && this.bold) == !!style.fontWeight && (this.blink || this.italic) == !!style.fontStyle && !!this.underline == !!obj.underline && !!this.strikethrough == !!obj.strikethrough
};
hterm.TextAttributes.prototype.setDefaults = function (foreground, background) {
    this.defaultForeground = foreground;
    this.defaultBackground = background;
    this.syncColors()
};
hterm.TextAttributes.prototype.syncColors = function () {
    function getBrightIndex(i) {
        if (i < 8)return i + 8;
        return i
    }

    var foregroundSource = this.foregroundSource;
    var backgroundSource = this.backgroundSource;
    var defaultForeground = this.DEFAULT_COLOR;
    var defaultBackground = this.DEFAULT_COLOR;
    if (this.inverse) {
        foregroundSource = this.backgroundSource;
        backgroundSource = this.foregroundSource;
        defaultForeground = this.defaultBackground;
        defaultBackground = this.defaultForeground
    }
    if (this.enableBoldAsBright && this.bold)if (foregroundSource !=
        this.SRC_DEFAULT && foregroundSource != this.SRC_RGB)foregroundSource = getBrightIndex(foregroundSource);
    if (this.invisible) {
        foregroundSource = backgroundSource;
        defaultForeground = this.defaultBackground
    }
    if (foregroundSource != this.SRC_RGB)this.foreground = foregroundSource == this.SRC_DEFAULT ? defaultForeground : this.colorPalette[foregroundSource];
    if (this.faint && !this.invisible) {
        var colorToMakeFaint = this.foreground == this.DEFAULT_COLOR ? this.defaultForeground : this.foreground;
        this.foreground = lib.colors.mix(colorToMakeFaint,
            "rgb(0, 0, 0)", .3333)
    }
    if (backgroundSource != this.SRC_RGB)this.background = backgroundSource == this.SRC_DEFAULT ? defaultBackground : this.colorPalette[backgroundSource]
};
hterm.TextAttributes.containersMatch = function (obj1, obj2) {
    if (typeof obj1 == "string")return hterm.TextAttributes.containerIsDefault(obj2);
    if (obj1.nodeType != obj2.nodeType)return false;
    if (obj1.nodeType == 3)return true;
    var style1 = obj1.style;
    var style2 = obj2.style;
    return style1.color == style2.color && style1.backgroundColor == style2.backgroundColor && style1.fontWeight == style2.fontWeight && style1.fontStyle == style2.fontStyle && style1.textDecoration == style2.textDecoration
};
hterm.TextAttributes.containerIsDefault = function (obj) {
    return typeof obj == "string" || obj.nodeType == 3
};
hterm.TextAttributes.nodeWidth = function (node) {
    if (node.wcNode)return lib.wc.strWidth(node.textContent); else return node.textContent.length
};
hterm.TextAttributes.nodeSubstr = function (node, start, width) {
    if (node.wcNode)return lib.wc.substr(node.textContent, start, width); else return node.textContent.substr(start, width)
};
hterm.TextAttributes.nodeSubstring = function (node, start, end) {
    if (node.wcNode)return lib.wc.substring(node.textContent, start, end); else return node.textContent.substring(start, end)
};
hterm.TextAttributes.splitWidecharString = function (str) {
    var rv = [];
    var base = 0, length = 0;
    for (var i = 0; i < str.length;) {
        var c = str.codePointAt(i);
        var increment = c <= 65535 ? 1 : 2;
        if (c < 128 || lib.wc.charWidth(c) == 1)length += increment; else {
            if (length)rv.push({str: str.substr(base, length)});
            rv.push({str: str.substr(i, increment), wcNode: true});
            base = i + increment;
            length = 0
        }
        i += increment
    }
    if (length)rv.push({str: str.substr(base, length)});
    return rv
};
"use strict";
lib.rtdep("lib.colors", "lib.f", "lib.UTF8Decoder", "hterm.VT.CharacterMap");
hterm.VT = function (terminal) {
    this.terminal = terminal;
    terminal.onMouse = this.onTerminalMouse_.bind(this);
    this.mouseReport = this.MOUSE_REPORT_DISABLED;
    this.parseState_ = new hterm.VT.ParseState(this.parseUnknown_);
    this.leadingModifier_ = "";
    this.trailingModifier_ = "";
    this.allowColumnWidthChanges_ = false;
    this.oscTimeLimit_ = 2E4;
    var cc1 = Object.keys(hterm.VT.CC1).map(function (e) {
        return "\\x" + lib.f.zpad(e.charCodeAt().toString(16), 2)
    }).join("");
    this.cc1Pattern_ = new RegExp("[" + cc1 + "]");
    this.utf8Decoder_ = new lib.UTF8Decoder;
    this.enable8BitControl = false;
    this.enableClipboardWrite = true;
    this.enableDec12 = false;
    this.characterEncoding = "utf-8";
    this.maxStringSequence = 1024;
    this.warnUnimplemented = true;
    this.G0 = hterm.VT.CharacterMap.maps["B"];
    this.G1 = hterm.VT.CharacterMap.maps["0"];
    this.G2 = hterm.VT.CharacterMap.maps["B"];
    this.G3 = hterm.VT.CharacterMap.maps["B"];
    this.GL = "G0";
    this.GR = "G0";
    this.savedState_ = new hterm.VT.CursorState(this)
};
hterm.VT.prototype.MOUSE_REPORT_DISABLED = 0;
hterm.VT.prototype.MOUSE_REPORT_CLICK = 1;
hterm.VT.prototype.MOUSE_REPORT_DRAG = 3;
hterm.VT.ParseState = function (defaultFunction, opt_buf) {
    this.defaultFunction = defaultFunction;
    this.buf = opt_buf || null;
    this.pos = 0;
    this.func = defaultFunction;
    this.args = []
};
hterm.VT.ParseState.prototype.reset = function (opt_buf) {
    this.resetParseFunction();
    this.resetBuf(opt_buf || "");
    this.resetArguments()
};
hterm.VT.ParseState.prototype.resetParseFunction = function () {
    this.func = this.defaultFunction
};
hterm.VT.ParseState.prototype.resetBuf = function (opt_buf) {
    this.buf = typeof opt_buf == "string" ? opt_buf : null;
    this.pos = 0
};
hterm.VT.ParseState.prototype.resetArguments = function (opt_arg_zero) {
    this.args.length = 0;
    if (typeof opt_arg_zero != "undefined")this.args[0] = opt_arg_zero
};
hterm.VT.ParseState.prototype.iarg = function (argnum, defaultValue) {
    var str = this.args[argnum];
    if (str) {
        var ret = parseInt(str, 10);
        if (ret == 0)ret = defaultValue;
        return ret
    }
    return defaultValue
};
hterm.VT.ParseState.prototype.advance = function (count) {
    this.pos += count
};
hterm.VT.ParseState.prototype.peekRemainingBuf = function () {
    return this.buf.substr(this.pos)
};
hterm.VT.ParseState.prototype.peekChar = function () {
    return this.buf.substr(this.pos, 1)
};
hterm.VT.ParseState.prototype.consumeChar = function () {
    return this.buf.substr(this.pos++, 1)
};
hterm.VT.ParseState.prototype.isComplete = function () {
    return this.buf == null || this.buf.length <= this.pos
};
hterm.VT.CursorState = function (vt) {
    this.vt_ = vt;
    this.save()
};
hterm.VT.CursorState.prototype.save = function () {
    this.cursor = this.vt_.terminal.saveCursor();
    this.textAttributes = this.vt_.terminal.getTextAttributes().clone();
    this.GL = this.vt_.GL;
    this.GR = this.vt_.GR;
    this.G0 = this.vt_.G0;
    this.G1 = this.vt_.G1;
    this.G2 = this.vt_.G2;
    this.G3 = this.vt_.G3
};
hterm.VT.CursorState.prototype.restore = function () {
    this.vt_.terminal.restoreCursor(this.cursor);
    this.vt_.terminal.setTextAttributes(this.textAttributes.clone());
    this.vt_.GL = this.GL;
    this.vt_.GR = this.GR;
    this.vt_.G0 = this.G0;
    this.vt_.G1 = this.G1;
    this.vt_.G2 = this.G2;
    this.vt_.G3 = this.G3
};
hterm.VT.prototype.reset = function () {
    this.G0 = hterm.VT.CharacterMap.maps["B"];
    this.G1 = hterm.VT.CharacterMap.maps["0"];
    this.G2 = hterm.VT.CharacterMap.maps["B"];
    this.G3 = hterm.VT.CharacterMap.maps["B"];
    this.GL = "G0";
    this.GR = "G0";
    this.savedState_ = new hterm.VT.CursorState(this);
    this.mouseReport = this.MOUSE_REPORT_DISABLED
};
hterm.VT.prototype.onTerminalMouse_ = function (e) {
    if (this.mouseReport == this.MOUSE_REPORT_DISABLED)return;
    var response;
    var mod = 0;
    if (e.shiftKey)mod |= 4;
    if (e.metaKey || this.terminal.keyboard.altIsMeta && e.altKey)mod |= 8;
    if (e.ctrlKey)mod |= 16;
    var x = String.fromCharCode(lib.f.clamp(e.terminalColumn + 32, 32, 255));
    var y = String.fromCharCode(lib.f.clamp(e.terminalRow + 32, 32, 255));
    switch (e.type) {
        case "mousewheel":
            b = (e.wheelDeltaY > 0 ? 0 : 1) + 96;
            b |= mod;
            response = "\u001b[M" + String.fromCharCode(b) + x + y;
            e.preventDefault();
            break;
        case "mousedown":
            var b = Math.min(e.which - 1, 2) + 32;
            b |= mod;
            response = "\u001b[M" + String.fromCharCode(b) + x + y;
            break;
        case "mouseup":
            response = "\u001b[M#" + x + y;
            break;
        case "mousemove":
            if (this.mouseReport == this.MOUSE_REPORT_DRAG && e.which) {
                b = 32 + Math.min(e.which - 1, 2);
                b += 32;
                b |= mod;
                response = "\u001b[M" + String.fromCharCode(b) + x + y
            }
            break;
        case "click":
        case "dblclick":
            break;
        default:
            console.error("Unknown mouse event: " + e.type, e);
            break
    }
    if (response)this.terminal.io.sendString(response)
};
hterm.VT.prototype.interpret = function (buf) {
    this.parseState_.resetBuf(this.decode(buf));
    while (!this.parseState_.isComplete()) {
        var func = this.parseState_.func;
        var pos = this.parseState_.pos;
        var buf = this.parseState_.buf;
        this.parseState_.func.call(this, this.parseState_);
        if (this.parseState_.func == func && this.parseState_.pos == pos && this.parseState_.buf == buf)throw"Parser did not alter the state!";
    }
};
hterm.VT.prototype.decode = function (str) {
    if (this.characterEncoding == "utf-8")return this.decodeUTF8(str);
    return str
};
hterm.VT.prototype.encodeUTF8 = function (str) {
    return lib.encodeUTF8(str)
};
hterm.VT.prototype.decodeUTF8 = function (str) {
    return this.utf8Decoder_.decode(str)
};
hterm.VT.prototype.parseUnknown_ = function (parseState) {
    var self = this;

    function print(str) {
        if (self[self.GL].GL)str = self[self.GL].GL(str);
        if (self[self.GR].GR)str = self[self.GR].GR(str);
        self.terminal.print(str)
    }

    var buf = parseState.peekRemainingBuf();
    var nextControl = buf.search(this.cc1Pattern_);
    if (nextControl == 0) {
        this.dispatch("CC1", buf.substr(0, 1), parseState);
        parseState.advance(1);
        return
    }
    if (nextControl == -1) {
        print(buf);
        parseState.reset();
        return
    }
    print(buf.substr(0, nextControl));
    this.dispatch("CC1", buf.substr(nextControl,
        1), parseState);
    parseState.advance(nextControl + 1)
};
hterm.VT.prototype.parseCSI_ = function (parseState) {
    var ch = parseState.peekChar();
    var args = parseState.args;
    if (ch >= "@" && ch <= "~") {
        this.dispatch("CSI", this.leadingModifier_ + this.trailingModifier_ + ch, parseState);
        parseState.resetParseFunction()
    } else if (ch == ";")if (this.trailingModifier_)parseState.resetParseFunction(); else {
        if (!args.length)args.push("");
        args.push("")
    } else if (ch >= "0" && ch <= "9")if (this.trailingModifier_)parseState.resetParseFunction(); else if (!args.length)args[0] = ch; else args[args.length - 1] +=
        ch; else if (ch >= " " && ch <= "?" && ch != ":")if (!args.length)this.leadingModifier_ += ch; else this.trailingModifier_ += ch; else if (this.cc1Pattern_.test(ch))this.dispatch("CC1", ch, parseState); else parseState.resetParseFunction();
    parseState.advance(1)
};
hterm.VT.prototype.parseUntilStringTerminator_ = function (parseState) {
    var buf = parseState.peekRemainingBuf();
    var nextTerminator = buf.search(/(\x1b\\|\x07)/);
    var args = parseState.args;
    if (!args.length) {
        args[0] = "";
        args[1] = new Date
    }
    if (nextTerminator == -1) {
        args[0] += buf;
        var abortReason;
        if (args[0].length > this.maxStringSequence)abortReason = "too long: " + args[0].length;
        if (args[0].indexOf("\u001b") != -1)abortReason = "embedded escape: " + args[0].indexOf("\u001b");
        if (new Date - args[1] > this.oscTimeLimit_)abortReason = "timeout expired: " +
            new Date - args[1];
        if (abortReason) {
            console.log("parseUntilStringTerminator_: aborting: " + abortReason, args[0]);
            parseState.reset(args[0]);
            return false
        }
        parseState.advance(buf.length);
        return true
    }
    if (args[0].length + nextTerminator > this.maxStringSequence) {
        parseState.reset(args[0] + buf);
        return false
    }
    args[0] += buf.substr(0, nextTerminator);
    parseState.resetParseFunction();
    parseState.advance(nextTerminator + (buf.substr(nextTerminator, 1) == "\u001b" ? 2 : 1));
    return true
};
hterm.VT.prototype.dispatch = function (type, code, parseState) {
    var handler = hterm.VT[type][code];
    if (!handler) {
        if (this.warnUnimplemented)console.warn("Unknown " + type + " code: " + JSON.stringify(code));
        return
    }
    if (handler == hterm.VT.ignore) {
        if (this.warnUnimplemented)console.warn("Ignored " + type + " code: " + JSON.stringify(code));
        return
    }
    if (type == "CC1" && code > "\u007f" && !this.enable8BitControl) {
        console.warn("Ignoring 8-bit control code: 0x" + code.charCodeAt(0).toString(16));
        return
    }
    handler.apply(this, [parseState, code])
};
hterm.VT.prototype.setANSIMode = function (code, state) {
    if (code == "4")this.terminal.setInsertMode(state); else if (code == "20")this.terminal.setAutoCarriageReturn(state); else if (this.warnUnimplemented)console.warn("Unimplemented ANSI Mode: " + code)
};
hterm.VT.prototype.setDECMode = function (code, state) {
    switch (code) {
        case "1":
            this.terminal.keyboard.applicationCursor = state;
            break;
        case "3":
            if (this.allowColumnWidthChanges_) {
                this.terminal.setWidth(state ? 132 : 80);
                this.terminal.clearHome();
                this.terminal.setVTScrollRegion(null, null)
            }
            break;
        case "5":
            this.terminal.setReverseVideo(state);
            break;
        case "6":
            this.terminal.setOriginMode(state);
            break;
        case "7":
            this.terminal.setWraparound(state);
            break;
        case "12":
            if (this.enableDec12)this.terminal.setCursorBlink(state);
            break;
        case "25":
            this.terminal.setCursorVisible(state);
            break;
        case "40":
            this.terminal.allowColumnWidthChanges_ = state;
            break;
        case "45":
            this.terminal.setReverseWraparound(state);
            break;
        case "67":
            this.terminal.keyboard.backspaceSendsBackspace = state;
            break;
        case "1000":
            this.mouseReport = state ? this.MOUSE_REPORT_CLICK : this.MOUSE_REPORT_DISABLED;
            break;
        case "1002":
            this.mouseReport = state ? this.MOUSE_REPORT_DRAG : this.MOUSE_REPORT_DISABLED;
            break;
        case "1010":
            this.terminal.scrollOnOutput = state;
            break;
        case "1011":
            this.terminal.scrollOnKeystroke =
                state;
            break;
        case "1036":
            this.terminal.keyboard.metaSendsEscape = state;
            break;
        case "1039":
            if (state) {
                if (!this.terminal.keyboard.previousAltSendsWhat_) {
                    this.terminal.keyboard.previousAltSendsWhat_ = this.terminal.keyboard.altSendsWhat;
                    this.terminal.keyboard.altSendsWhat = "escape"
                }
            } else if (this.terminal.keyboard.previousAltSendsWhat_) {
                this.terminal.keyboard.altSendsWhat = this.terminal.keyboard.previousAltSendsWhat_;
                this.terminal.keyboard.previousAltSendsWhat_ = null
            }
            break;
        case "47":
        case "1047":
            this.terminal.setAlternateMode(state);
            break;
        case "1048":
            this.savedState_.save();
        case "1049":
            if (state) {
                this.savedState_.save();
                this.terminal.setAlternateMode(state);
                this.terminal.clear()
            } else {
                this.terminal.setAlternateMode(state);
                this.savedState_.restore()
            }
            break;
        case "2004":
            this.terminal.setBracketedPaste(state);
            break;
        default:
            if (this.warnUnimplemented)console.warn("Unimplemented DEC Private Mode: " + code);
            break
    }
};
hterm.VT.ignore = function () {
};
hterm.VT.CC1 = {};
hterm.VT.ESC = {};
hterm.VT.CSI = {};
hterm.VT.OSC = {};
hterm.VT.VT52 = {};
hterm.VT.CC1["\x00"] = function () {
};
hterm.VT.CC1["\u0005"] = hterm.VT.ignore;
hterm.VT.CC1["\u0007"] = function () {
    this.terminal.ringBell()
};
hterm.VT.CC1["\b"] = function () {
    this.terminal.cursorLeft(1)
};
hterm.VT.CC1["\t"] = function () {
    this.terminal.forwardTabStop()
};
hterm.VT.CC1["\n"] = function () {
    this.terminal.formFeed()
};
hterm.VT.CC1["\x0B"] = hterm.VT.CC1["\n"];
hterm.VT.CC1["\f"] = function () {
    this.terminal.formFeed()
};
hterm.VT.CC1["\r"] = function () {
    this.terminal.setCursorColumn(0)
};
hterm.VT.CC1["\u000e"] = function () {
    this.GL = "G1"
};
hterm.VT.CC1["\u000f"] = function () {
    this.GL = "G0"
};
hterm.VT.CC1["\u0011"] = hterm.VT.ignore;
hterm.VT.CC1["\u0013"] = hterm.VT.ignore;
hterm.VT.CC1["\u0018"] = function (parseState) {
    if (this.GL == "G1")this.GL = "G0";
    parseState.resetParseFunction();
    this.terminal.print("?")
};
hterm.VT.CC1["\u001a"] = hterm.VT.CC1["\u0018"];
hterm.VT.CC1["\u001b"] = function (parseState) {
    function parseESC(parseState) {
        var ch = parseState.consumeChar();
        if (ch == "\u001b")return;
        this.dispatch("ESC", ch, parseState);
        if (parseState.func == parseESC)parseState.resetParseFunction()
    }

    parseState.func = parseESC
};
hterm.VT.CC1["\u007f"] = hterm.VT.ignore;
hterm.VT.CC1["\u0084"] = hterm.VT.ESC["D"] = function () {
    this.terminal.lineFeed()
};
hterm.VT.CC1["\u0085"] = hterm.VT.ESC["E"] = function () {
    this.terminal.setCursorColumn(0);
    this.terminal.cursorDown(1)
};
hterm.VT.CC1["\u0088"] = hterm.VT.ESC["H"] = function () {
    this.terminal.setTabStop(this.terminal.getCursorColumn())
};
hterm.VT.CC1["\u008d"] = hterm.VT.ESC["M"] = function () {
    this.terminal.reverseLineFeed()
};
hterm.VT.CC1["\u008e"] = hterm.VT.ESC["N"] = hterm.VT.ignore;
hterm.VT.CC1["\u008f"] = hterm.VT.ESC["O"] = hterm.VT.ignore;
hterm.VT.CC1["\u0090"] = hterm.VT.ESC["P"] = function (parseState) {
    parseState.resetArguments();
    parseState.func = this.parseUntilStringTerminator_
};
hterm.VT.CC1["\u0096"] = hterm.VT.ESC["V"] = hterm.VT.ignore;
hterm.VT.CC1["\u0097"] = hterm.VT.ESC["W"] = hterm.VT.ignore;
hterm.VT.CC1["\u0098"] = hterm.VT.ESC["X"] = hterm.VT.ignore;
hterm.VT.CC1["\u009a"] = hterm.VT.ESC["Z"] = function () {
    this.terminal.io.sendString("\u001b[?1;2c")
};
hterm.VT.CC1["\u009b"] = hterm.VT.ESC["["] = function (parseState) {
    parseState.resetArguments();
    this.leadingModifier_ = "";
    this.trailingModifier_ = "";
    parseState.func = this.parseCSI_
};
hterm.VT.CC1["\u009c"] = hterm.VT.ESC["\\"] = hterm.VT.ignore;
hterm.VT.CC1["\u009d"] = hterm.VT.ESC["]"] = function (parseState) {
    parseState.resetArguments();
    function parseOSC(parseState) {
        if (!this.parseUntilStringTerminator_(parseState))return;
        if (parseState.func == parseOSC)return;
        var ary = parseState.args[0].match(/^(\d+);(.*)$/);
        if (ary) {
            parseState.args[0] = ary[2];
            this.dispatch("OSC", ary[1], parseState)
        } else console.warn("Invalid OSC: " + JSON.stringify(parseState.args[0]))
    }

    parseState.func = parseOSC
};
hterm.VT.CC1["\u009e"] = hterm.VT.ESC["^"] = function (parseState) {
    parseState.resetArguments();
    parseState.func = this.parseUntilStringTerminator_
};
hterm.VT.CC1["\u009f"] = hterm.VT.ESC["_"] = function (parseState) {
    parseState.resetArguments();
    parseState.func = this.parseUntilStringTerminator_
};
hterm.VT.ESC[" "] = function (parseState) {
    parseState.func = function (parseState) {
        var ch = parseState.consumeChar();
        if (this.warnUnimplemented)console.warn("Unimplemented sequence: ESC 0x20 " + ch);
        parseState.resetParseFunction()
    }
};
hterm.VT.ESC["#"] = function (parseState) {
    parseState.func = function (parseState) {
        var ch = parseState.consumeChar();
        if (ch == "8")this.terminal.fill("E");
        parseState.resetParseFunction()
    }
};
hterm.VT.ESC["%"] = function (parseState) {
    parseState.func = function (parseState) {
        var ch = parseState.consumeChar();
        if (ch != "@" && ch != "G" && this.warnUnimplemented)console.warn("Unknown ESC % argument: " + JSON.stringify(ch));
        parseState.resetParseFunction()
    }
};
hterm.VT.ESC["("] = hterm.VT.ESC[")"] = hterm.VT.ESC["*"] = hterm.VT.ESC["+"] = hterm.VT.ESC["-"] = hterm.VT.ESC["."] = hterm.VT.ESC["/"] = function (parseState, code) {
    parseState.func = function (parseState) {
        var ch = parseState.consumeChar();
        if (ch == "\u001b") {
            parseState.resetParseFunction();
            parseState.func();
            return
        }
        if (ch in hterm.VT.CharacterMap.maps)if (code == "(")this.G0 = hterm.VT.CharacterMap.maps[ch]; else if (code == ")" || code == "-")this.G1 = hterm.VT.CharacterMap.maps[ch]; else if (code == "*" || code == ".")this.G2 = hterm.VT.CharacterMap.maps[ch];
        else {
            if (code == "+" || code == "/")this.G3 = hterm.VT.CharacterMap.maps[ch]
        } else if (this.warnUnimplemented)console.log('Invalid character set for "' + code + '": ' + ch);
        parseState.resetParseFunction()
    }
};
hterm.VT.ESC["6"] = hterm.VT.ignore;
hterm.VT.ESC["7"] = function () {
    this.savedState_.save()
};
hterm.VT.ESC["8"] = function () {
    this.savedState_.restore()
};
hterm.VT.ESC["9"] = hterm.VT.ignore;
hterm.VT.ESC["="] = function () {
    this.terminal.keyboard.applicationKeypad = true
};
hterm.VT.ESC[">"] = function () {
    this.terminal.keyboard.applicationKeypad = false
};
hterm.VT.ESC["F"] = hterm.VT.ignore;
hterm.VT.ESC["c"] = function () {
    this.reset();
    this.terminal.reset()
};
hterm.VT.ESC["l"] = hterm.VT.ESC["m"] = hterm.VT.ignore;
hterm.VT.ESC["n"] = function () {
    this.GL = "G2"
};
hterm.VT.ESC["o"] = function () {
    this.GL = "G3"
};
hterm.VT.ESC["|"] = function () {
    this.GR = "G3"
};
hterm.VT.ESC["}"] = function () {
    this.GR = "G2"
};
hterm.VT.ESC["~"] = function () {
    this.GR = "G1"
};
hterm.VT.OSC["0"] = function (parseState) {
    this.terminal.setWindowTitle(parseState.args[0])
};
hterm.VT.OSC["2"] = hterm.VT.OSC["0"];
hterm.VT.OSC["4"] = function (parseState) {
    var args = parseState.args[0].split(";");
    var pairCount = parseInt(args.length / 2);
    var colorPalette = this.terminal.getTextAttributes().colorPalette;
    var responseArray = [];
    for (var pairNumber = 0; pairNumber < pairCount; ++pairNumber) {
        var colorIndex = parseInt(args[pairNumber * 2]);
        var colorValue = args[pairNumber * 2 + 1];
        if (colorIndex >= colorPalette.length)continue;
        if (colorValue == "?") {
            colorValue = lib.colors.rgbToX11(colorPalette[colorIndex]);
            if (colorValue)responseArray.push(colorIndex + ";" +
                colorValue);
            continue
        }
        colorValue = lib.colors.x11ToCSS(colorValue);
        if (colorValue)colorPalette[colorIndex] = colorValue
    }
    if (responseArray.length)this.terminal.io.sendString("\u001b]4;" + responseArray.join(";") + "\u0007")
};
hterm.VT.OSC["50"] = function (parseState) {
    var args = parseState.args[0].match(/CursorShape=(.)/i);
    if (!args) {
        console.warn("Could not parse OSC 50 args: " + parseState.args[0]);
        return
    }
    switch (args[1]) {
        case "1":
            this.terminal.setCursorShape(hterm.Terminal.cursorShape.BEAM);
            break;
        case "2":
            this.terminal.setCursorShape(hterm.Terminal.cursorShape.UNDERLINE);
            break;
        default:
            this.terminal.setCursorShape(hterm.Terminal.cursorShape.BLOCK)
    }
};
hterm.VT.OSC["52"] = function (parseState) {
    var args = parseState.args[0].match(/^[cps01234567]*;(.*)/);
    if (!args)return;
    var data = window.atob(args[1]);
    if (data)this.terminal.copyStringToClipboard(this.decode(data))
};
hterm.VT.CSI["@"] = function (parseState) {
    this.terminal.insertSpace(parseState.iarg(0, 1))
};
hterm.VT.CSI["A"] = function (parseState) {
    this.terminal.cursorUp(parseState.iarg(0, 1))
};
hterm.VT.CSI["B"] = function (parseState) {
    this.terminal.cursorDown(parseState.iarg(0, 1))
};
hterm.VT.CSI["C"] = function (parseState) {
    this.terminal.cursorRight(parseState.iarg(0, 1))
};
hterm.VT.CSI["D"] = function (parseState) {
    this.terminal.cursorLeft(parseState.iarg(0, 1))
};
hterm.VT.CSI["E"] = function (parseState) {
    this.terminal.cursorDown(parseState.iarg(0, 1));
    this.terminal.setCursorColumn(0)
};
hterm.VT.CSI["F"] = function (parseState) {
    this.terminal.cursorUp(parseState.iarg(0, 1));
    this.terminal.setCursorColumn(0)
};
hterm.VT.CSI["G"] = function (parseState) {
    this.terminal.setCursorColumn(parseState.iarg(0, 1) - 1)
};
hterm.VT.CSI["H"] = function (parseState) {
    this.terminal.setCursorPosition(parseState.iarg(0, 1) - 1, parseState.iarg(1, 1) - 1)
};
hterm.VT.CSI["I"] = function (parseState) {
    var count = parseState.iarg(0, 1);
    count = lib.f.clamp(count, 1, this.terminal.screenSize.width);
    for (var i = 0; i < count; i++)this.terminal.forwardTabStop()
};
hterm.VT.CSI["J"] = hterm.VT.CSI["?J"] = function (parseState, code) {
    var arg = parseState.args[0];
    if (!arg || arg == "0")this.terminal.eraseBelow(); else if (arg == "1")this.terminal.eraseAbove(); else if (arg == "2")this.terminal.clear(); else if (arg == "3")this.terminal.clear()
};
hterm.VT.CSI["K"] = hterm.VT.CSI["?K"] = function (parseState, code) {
    var arg = parseState.args[0];
    if (!arg || arg == "0")this.terminal.eraseToRight(); else if (arg == "1")this.terminal.eraseToLeft(); else if (arg == "2")this.terminal.eraseLine()
};
hterm.VT.CSI["L"] = function (parseState) {
    this.terminal.insertLines(parseState.iarg(0, 1))
};
hterm.VT.CSI["M"] = function (parseState) {
    this.terminal.deleteLines(parseState.iarg(0, 1))
};
hterm.VT.CSI["P"] = function (parseState) {
    this.terminal.deleteChars(parseState.iarg(0, 1))
};
hterm.VT.CSI["S"] = function (parseState) {
    this.terminal.vtScrollUp(parseState.iarg(0, 1))
};
hterm.VT.CSI["T"] = function (parseState) {
    if (parseState.args.length <= 1)this.terminal.vtScrollDown(parseState.iarg(0, 1))
};
hterm.VT.CSI[">T"] = hterm.VT.ignore;
hterm.VT.CSI["X"] = function (parseState) {
    this.terminal.eraseToRight(parseState.iarg(0, 1))
};
hterm.VT.CSI["Z"] = function (parseState) {
    var count = parseState.iarg(0, 1);
    count = lib.f.clamp(count, 1, this.terminal.screenSize.width);
    for (var i = 0; i < count; i++)this.terminal.backwardTabStop()
};
hterm.VT.CSI["`"] = function (parseState) {
    this.terminal.setCursorColumn(parseState.iarg(0, 1) - 1)
};
hterm.VT.CSI["b"] = hterm.VT.ignore;
hterm.VT.CSI["c"] = function (parseState) {
    if (!parseState.args[0] || parseState.args[0] == "0")this.terminal.io.sendString("\u001b[?1;2c")
};
hterm.VT.CSI[">c"] = function (parseState) {
    this.terminal.io.sendString("\u001b[>0;256;0c")
};
hterm.VT.CSI["d"] = function (parseState) {
    this.terminal.setAbsoluteCursorRow(parseState.iarg(0, 1) - 1)
};
hterm.VT.CSI["f"] = hterm.VT.CSI["H"];
hterm.VT.CSI["g"] = function (parseState) {
    if (!parseState.args[0] || parseState.args[0] == "0")this.terminal.clearTabStopAtCursor(false); else if (parseState.args[0] == "3")this.terminal.clearAllTabStops()
};
hterm.VT.CSI["h"] = function (parseState) {
    for (var i = 0; i < parseState.args.length; i++)this.setANSIMode(parseState.args[i], true)
};
hterm.VT.CSI["?h"] = function (parseState) {
    for (var i = 0; i < parseState.args.length; i++)this.setDECMode(parseState.args[i], true)
};
hterm.VT.CSI["i"] = hterm.VT.CSI["?i"] = hterm.VT.ignore;
hterm.VT.CSI["l"] = function (parseState) {
    for (var i = 0; i < parseState.args.length; i++)this.setANSIMode(parseState.args[i], false)
};
hterm.VT.CSI["?l"] = function (parseState) {
    for (var i = 0; i < parseState.args.length; i++)this.setDECMode(parseState.args[i], false)
};
hterm.VT.CSI["m"] = function (parseState) {
    function get256(i) {
        if (parseState.args.length < i + 2 || parseState.args[i + 1] != "5")return null;
        return parseState.iarg(i + 2, 0)
    }

    function getTrueColor(i) {
        if (parseState.args.length < i + 5 || parseState.args[i + 1] != "2")return null;
        var r = parseState.iarg(i + 2, 0);
        var g = parseState.iarg(i + 3, 0);
        var b = parseState.iarg(i + 4, 0);
        return "rgb(" + r + " ," + g + " ," + b + ")"
    }

    var attrs = this.terminal.getTextAttributes();
    if (!parseState.args.length) {
        attrs.reset();
        return
    }
    for (var i = 0; i < parseState.args.length; i++) {
        var arg =
            parseState.iarg(i, 0);
        if (arg < 30)if (arg == 0)attrs.reset(); else if (arg == 1)attrs.bold = true; else if (arg == 2)attrs.faint = true; else if (arg == 3)attrs.italic = true; else if (arg == 4)attrs.underline = true; else if (arg == 5)attrs.blink = true; else if (arg == 7)attrs.inverse = true; else if (arg == 8)attrs.invisible = true; else if (arg == 9)attrs.strikethrough = true; else if (arg == 22) {
            attrs.bold = false;
            attrs.faint = false
        } else if (arg == 23)attrs.italic = false; else if (arg == 24)attrs.underline = false; else if (arg == 25)attrs.blink = false; else if (arg ==
            27)attrs.inverse = false; else if (arg == 28)attrs.invisible = false; else {
            if (arg == 29)attrs.strikethrough = false
        } else if (arg < 50)if (arg < 38)attrs.foregroundSource = arg - 30; else if (arg == 38) {
            var trueColor = getTrueColor(i);
            if (trueColor != null) {
                attrs.foregroundSource = attrs.SRC_RGB;
                attrs.foreground = trueColor;
                i += 5
            } else {
                var c = get256(i);
                if (c == null)break;
                i += 2;
                if (c >= attrs.colorPalette.length)continue;
                attrs.foregroundSource = c
            }
        } else if (arg == 39)attrs.foregroundSource = attrs.SRC_DEFAULT; else if (arg < 48)attrs.backgroundSource = arg -
            40; else if (arg == 48) {
            var trueColor = getTrueColor(i);
            if (trueColor != null) {
                attrs.backgroundSource = attrs.SRC_RGB;
                attrs.background = trueColor;
                i += 5
            } else {
                var c = get256(i);
                if (c == null)break;
                i += 2;
                if (c >= attrs.colorPalette.length)continue;
                attrs.backgroundSource = c
            }
        } else attrs.backgroundSource = attrs.SRC_DEFAULT; else if (arg >= 90 && arg <= 97)attrs.foregroundSource = arg - 90 + 8; else if (arg >= 100 && arg <= 107)attrs.backgroundSource = arg - 100 + 8
    }
    attrs.setDefaults(this.terminal.getForegroundColor(), this.terminal.getBackgroundColor())
};
hterm.VT.CSI[">m"] = hterm.VT.ignore;
hterm.VT.CSI["n"] = function (parseState) {
    if (parseState.args[0] == "5")this.terminal.io.sendString("\u001b0n"); else if (parseState.args[0] == "6") {
        var row = this.terminal.getCursorRow() + 1;
        var col = this.terminal.getCursorColumn() + 1;
        this.terminal.io.sendString("\u001b[" + row + ";" + col + "R")
    }
};
hterm.VT.CSI[">n"] = hterm.VT.ignore;
hterm.VT.CSI["?n"] = function (parseState) {
    if (parseState.args[0] == "6") {
        var row = this.terminal.getCursorRow() + 1;
        var col = this.terminal.getCursorColumn() + 1;
        this.terminal.io.sendString("\u001b[" + row + ";" + col + "R")
    } else if (parseState.args[0] == "15")this.terminal.io.sendString("\u001b[?11n"); else if (parseState.args[0] == "25")this.terminal.io.sendString("\u001b[?21n"); else if (parseState.args[0] == "26")this.terminal.io.sendString("\u001b[?12;1;0;0n"); else if (parseState.args[0] == "53")this.terminal.io.sendString("\u001b[?50n")
};
hterm.VT.CSI[">p"] = hterm.VT.ignore;
hterm.VT.CSI["!p"] = function () {
    this.reset();
    this.terminal.softReset()
};
hterm.VT.CSI["$p"] = hterm.VT.ignore;
hterm.VT.CSI["?$p"] = hterm.VT.ignore;
hterm.VT.CSI['"p'] = hterm.VT.ignore;
hterm.VT.CSI["q"] = hterm.VT.ignore;
hterm.VT.CSI[" q"] = function (parseState) {
    var arg = parseState.args[0];
    if (arg == "0" || arg == "1") {
        this.terminal.setCursorShape(hterm.Terminal.cursorShape.BLOCK);
        this.terminal.setCursorBlink(true)
    } else if (arg == "2") {
        this.terminal.setCursorShape(hterm.Terminal.cursorShape.BLOCK);
        this.terminal.setCursorBlink(false)
    } else if (arg == "3") {
        this.terminal.setCursorShape(hterm.Terminal.cursorShape.UNDERLINE);
        this.terminal.setCursorBlink(true)
    } else if (arg == "4") {
        this.terminal.setCursorShape(hterm.Terminal.cursorShape.UNDERLINE);
        this.terminal.setCursorBlink(false)
    } else console.warn("Unknown cursor style: " + arg)
};
hterm.VT.CSI['"q'] = hterm.VT.ignore;
hterm.VT.CSI["r"] = function (parseState) {
    var args = parseState.args;
    var scrollTop = args[0] ? parseInt(args[0], 10) - 1 : null;
    var scrollBottom = args[1] ? parseInt(args[1], 10) - 1 : null;
    this.terminal.setVTScrollRegion(scrollTop, scrollBottom);
    this.terminal.setCursorPosition(0, 0)
};
hterm.VT.CSI["?r"] = hterm.VT.ignore;
hterm.VT.CSI["$r"] = hterm.VT.ignore;
hterm.VT.CSI["s"] = function () {
    this.savedState_.save()
};
hterm.VT.CSI["?s"] = hterm.VT.ignore;
hterm.VT.CSI["t"] = hterm.VT.ignore;
hterm.VT.CSI["$t"] = hterm.VT.ignore;
hterm.VT.CSI[">t"] = hterm.VT.ignore;
hterm.VT.CSI[" t"] = hterm.VT.ignore;
hterm.VT.CSI["u"] = function () {
    this.savedState_.restore()
};
hterm.VT.CSI[" u"] = hterm.VT.ignore;
hterm.VT.CSI["$v"] = hterm.VT.ignore;
hterm.VT.CSI["'w"] = hterm.VT.ignore;
hterm.VT.CSI["x"] = hterm.VT.ignore;
hterm.VT.CSI["*x"] = hterm.VT.ignore;
hterm.VT.CSI["$x"] = hterm.VT.ignore;
hterm.VT.CSI["z"] = function (parseState) {
    if (parseState.args.length < 1)return;
    var arg = parseState.args[0];
    if (arg == "0") {
        if (parseState.args.length < 2)return;
        this.terminal.getTextAttributes().tileData = parseState.args[1]
    } else if (arg == "1")this.terminal.getTextAttributes().tileData = null
};
hterm.VT.CSI["'z"] = hterm.VT.ignore;
hterm.VT.CSI["$z"] = hterm.VT.ignore;
hterm.VT.CSI["'{"] = hterm.VT.ignore;
hterm.VT.CSI["'|"] = hterm.VT.ignore;
hterm.VT.CSI[" }"] = hterm.VT.ignore;
hterm.VT.CSI[" ~"] = hterm.VT.ignore;
"use strict";
lib.rtdep("lib.f");
hterm.VT.CharacterMap = function (name, glmap) {
    this.name = name;
    this.GL = null;
    this.GR = null;
    if (glmap)this.reset(glmap)
};
hterm.VT.CharacterMap.prototype.reset = function (glmap) {
    this.glmap = glmap;
    var glkeys = Object.keys(this.glmap).map(function (key) {
        return "\\x" + lib.f.zpad(key.charCodeAt(0).toString(16))
    });
    this.glre = new RegExp("[" + glkeys.join("") + "]", "g");
    this.grmap = {};
    glkeys.forEach(function (glkey) {
        var grkey = String.fromCharCode(glkey.charCodeAt(0) & 128);
        this.grmap[grkey] = this.glmap[glkey]
    }.bind(this));
    var grkeys = Object.keys(this.grmap).map(function (key) {
        return "\\x" + lib.f.zpad(key.charCodeAt(0).toString(16), 2)
    });
    this.grre =
        new RegExp("[" + grkeys.join("") + "]", "g");
    this.GL = function (str) {
        return str.replace(this.glre, function (ch) {
            return this.glmap[ch]
        }.bind(this))
    }.bind(this);
    this.GR = function (str) {
        return str.replace(this.grre, function (ch) {
            return this.grmap[ch]
        }.bind(this))
    }.bind(this)
};
hterm.VT.CharacterMap.maps = {};
hterm.VT.CharacterMap.maps["0"] = new hterm.VT.CharacterMap("graphic", {
    "`": "\u25c6",
    "a": "\u2592",
    "b": "\u2409",
    "c": "\u240c",
    "d": "\u240d",
    "e": "\u240a",
    "f": "\u00b0",
    "g": "\u00b1",
    "h": "\u2424",
    "i": "\u240b",
    "j": "\u2518",
    "k": "\u2510",
    "l": "\u250c",
    "m": "\u2514",
    "n": "\u253c",
    "o": "\u23ba",
    "p": "\u23bb",
    "q": "\u2500",
    "r": "\u23bc",
    "s": "\u23bd",
    "t": "\u251c",
    "u": "\u2524",
    "v": "\u2534",
    "w": "\u252c",
    "x": "\u2502",
    "y": "\u2264",
    "z": "\u2265",
    "{": "\u03c0",
    "|": "\u2260",
    "}": "\u00a3",
    "~": "\u00b7"
});
hterm.VT.CharacterMap.maps["A"] = new hterm.VT.CharacterMap("british", {"#": "\u00a3"});
hterm.VT.CharacterMap.maps["B"] = new hterm.VT.CharacterMap("us", null);
hterm.VT.CharacterMap.maps["4"] = new hterm.VT.CharacterMap("dutch", {
    "#": "\u00a3",
    "@": "\u00be",
    "[": "\u0132",
    "\\": "\u00bd",
    "]": "|",
    "{": "\u00a8",
    "|": "f",
    "}": "\u00bc",
    "~": "\u00b4"
});
hterm.VT.CharacterMap.maps["C"] = hterm.VT.CharacterMap.maps["5"] = new hterm.VT.CharacterMap("finnish", {
    "[": "\u00c4",
    "\\": "\u00d6",
    "]": "\u00c5",
    "^": "\u00dc",
    "`": "\u00e9",
    "{": "\u00e4",
    "|": "\u00f6",
    "}": "\u00e5",
    "~": "\u00fc"
});
hterm.VT.CharacterMap.maps["R"] = new hterm.VT.CharacterMap("french", {
    "#": "\u00a3",
    "@": "\u00e0",
    "[": "\u00b0",
    "\\": "\u00e7",
    "]": "\u00a7",
    "{": "\u00e9",
    "|": "\u00f9",
    "}": "\u00e8",
    "~": "\u00a8"
});
hterm.VT.CharacterMap.maps["Q"] = new hterm.VT.CharacterMap("french canadian", {
    "@": "\u00e0",
    "[": "\u00e2",
    "\\": "\u00e7",
    "]": "\u00ea",
    "^": "\u00ee",
    "`": "\u00f4",
    "{": "\u00e9",
    "|": "\u00f9",
    "}": "\u00e8",
    "~": "\u00fb"
});
hterm.VT.CharacterMap.maps["K"] = new hterm.VT.CharacterMap("german", {
    "@": "\u00a7",
    "[": "\u00c4",
    "\\": "\u00d6",
    "]": "\u00dc",
    "{": "\u00e4",
    "|": "\u00f6",
    "}": "\u00fc",
    "~": "\u00df"
});
hterm.VT.CharacterMap.maps["Y"] = new hterm.VT.CharacterMap("italian", {
    "#": "\u00a3",
    "@": "\u00a7",
    "[": "\u00b0",
    "\\": "\u00e7",
    "]": "\u00e9",
    "`": "\u00f9",
    "{": "\u00e0",
    "|": "\u00f2",
    "}": "\u00e8",
    "~": "\u00ec"
});
hterm.VT.CharacterMap.maps["E"] = hterm.VT.CharacterMap.maps["6"] = new hterm.VT.CharacterMap("norwegian/danish", {
    "@": "\u00c4",
    "[": "\u00c6",
    "\\": "\u00d8",
    "]": "\u00c5",
    "^": "\u00dc",
    "`": "\u00e4",
    "{": "\u00e6",
    "|": "\u00f8",
    "}": "\u00e5",
    "~": "\u00fc"
});
hterm.VT.CharacterMap.maps["Z"] = new hterm.VT.CharacterMap("spanish", {
    "#": "\u00a3",
    "@": "\u00a7",
    "[": "\u00a1",
    "\\": "\u00d1",
    "]": "\u00bf",
    "{": "\u00b0",
    "|": "\u00f1",
    "}": "\u00e7"
});
hterm.VT.CharacterMap.maps["7"] = hterm.VT.CharacterMap.maps["H"] = new hterm.VT.CharacterMap("swedish", {
    "@": "\u00c9",
    "[": "\u00c4",
    "\\": "\u00d6",
    "]": "\u00c5",
    "^": "\u00dc",
    "`": "\u00e9",
    "{": "\u00e4",
    "|": "\u00f6",
    "}": "\u00e5",
    "~": "\u00fc"
});
hterm.VT.CharacterMap.maps["="] = new hterm.VT.CharacterMap("swiss", {
    "#": "\u00f9",
    "@": "\u00e0",
    "[": "\u00e9",
    "\\": "\u00e7",
    "]": "\u00ea",
    "^": "\u00ee",
    "_": "\u00e8",
    "`": "\u00f4",
    "{": "\u00e4",
    "|": "\u00f6",
    "}": "\u00fc",
    "~": "\u00fb"
});
lib.resource.add("hterm/audio/bell", "audio/ogg;base64", "T2dnUwACAAAAAAAAAADhqW5KAAAAAMFvEjYBHgF2b3JiaXMAAAAAAYC7AAAAAAAAAHcBAAAAAAC4" + "AU9nZ1MAAAAAAAAAAAAA4aluSgEAAAAAesI3EC3//////////////////8kDdm9yYmlzHQAAAFhp" + "cGguT3JnIGxpYlZvcmJpcyBJIDIwMDkwNzA5AAAAAAEFdm9yYmlzKUJDVgEACAAAADFMIMWA0JBV" + "AAAQAABgJCkOk2ZJKaWUoSh5mJRISSmllMUwiZiUicUYY4wxxhhjjDHGGGOMIDRkFQAABACAKAmO" + "o+ZJas45ZxgnjnKgOWlOOKcgB4pR4DkJwvUmY26mtKZrbs4pJQgNWQUAAAIAQEghhRRSSCGFFGKI" + "IYYYYoghhxxyyCGnnHIKKqigggoyyCCDTDLppJNOOumoo4466ii00EILLbTSSkwx1VZjrr0GXXxz" +
    "zjnnnHPOOeecc84JQkNWAQAgAAAEQgYZZBBCCCGFFFKIKaaYcgoyyIDQkFUAACAAgAAAAABHkRRJ" + "sRTLsRzN0SRP8ixREzXRM0VTVE1VVVVVdV1XdmXXdnXXdn1ZmIVbuH1ZuIVb2IVd94VhGIZhGIZh" + "GIZh+H3f933f930gNGQVACABAKAjOZbjKaIiGqLiOaIDhIasAgBkAAAEACAJkiIpkqNJpmZqrmmb" + "tmirtm3LsizLsgyEhqwCAAABAAQAAAAAAKBpmqZpmqZpmqZpmqZpmqZpmqZpmmZZlmVZlmVZlmVZ" + "lmVZlmVZlmVZlmVZlmVZlmVZlmVZlmVZlmVZQGjIKgBAAgBAx3Ecx3EkRVIkx3IsBwgNWQUAyAAA" + "CABAUizFcjRHczTHczzHczxHdETJlEzN9EwPCA1ZBQAAAgAIAAAAAABAMRzFcRzJ0SRPUi3TcjVX" + "cz3Xc03XdV1XVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVYHQkFUAAAQAACGdZpZq" +
    "gAgzkGEgNGQVAIAAAAAYoQhDDAgNWQUAAAQAAIih5CCa0JrzzTkOmuWgqRSb08GJVJsnuamYm3PO" + "OeecbM4Z45xzzinKmcWgmdCac85JDJqloJnQmnPOeRKbB62p0ppzzhnnnA7GGWGcc85p0poHqdlY" + "m3POWdCa5qi5FJtzzomUmye1uVSbc84555xzzjnnnHPOqV6czsE54Zxzzonam2u5CV2cc875ZJzu" + "zQnhnHPOOeecc84555xzzglCQ1YBAEAAAARh2BjGnYIgfY4GYhQhpiGTHnSPDpOgMcgppB6NjkZK" + "qYNQUhknpXSC0JBVAAAgAACEEFJIIYUUUkghhRRSSCGGGGKIIaeccgoqqKSSiirKKLPMMssss8wy" + "y6zDzjrrsMMQQwwxtNJKLDXVVmONteaec645SGultdZaK6WUUkoppSA0ZBUAAAIAQCBkkEEGGYUU" + "UkghhphyyimnoIIKCA1ZBQAAAgAIAAAA8CTPER3RER3RER3RER3RER3P8RxREiVREiXRMi1TMz1V" +
    "VFVXdm1Zl3Xbt4Vd2HXf133f141fF4ZlWZZlWZZlWZZlWZZlWZZlCUJDVgEAIAAAAEIIIYQUUkgh" + "hZRijDHHnINOQgmB0JBVAAAgAIAAAAAAR3EUx5EcyZEkS7IkTdIszfI0T/M00RNFUTRNUxVd0RV1" + "0xZlUzZd0zVl01Vl1XZl2bZlW7d9WbZ93/d93/d93/d93/d939d1IDRkFQAgAQCgIzmSIimSIjmO" + "40iSBISGrAIAZAAABACgKI7iOI4jSZIkWZImeZZniZqpmZ7pqaIKhIasAgAAAQAEAAAAAACgaIqn" + "mIqniIrniI4oiZZpiZqquaJsyq7ruq7ruq7ruq7ruq7ruq7ruq7ruq7ruq7ruq7ruq7ruq7rukBo" + "yCoAQAIAQEdyJEdyJEVSJEVyJAcIDVkFAMgAAAgAwDEcQ1Ikx7IsTfM0T/M00RM90TM9VXRFFwgN" + "WQUAAAIACAAAAAAAwJAMS7EczdEkUVIt1VI11VItVVQ9VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV" +
    "VVVVVVVVVVVV1TRN0zSB0JCVAAAZAAAjQQYZhBCKcpBCbj1YCDHmJAWhOQahxBiEpxAzDDkNInSQ" + "QSc9uJI5wwzz4FIoFURMg40lN44gDcKmXEnlOAhCQ1YEAFEAAIAxyDHEGHLOScmgRM4xCZ2UyDkn" + "pZPSSSktlhgzKSWmEmPjnKPSScmklBhLip2kEmOJrQAAgAAHAIAAC6HQkBUBQBQAAGIMUgophZRS" + "zinmkFLKMeUcUko5p5xTzjkIHYTKMQadgxAppRxTzinHHITMQeWcg9BBKAAAIMABACDAQig0ZEUA" + "ECcA4HAkz5M0SxQlSxNFzxRl1xNN15U0zTQ1UVRVyxNV1VRV2xZNVbYlTRNNTfRUVRNFVRVV05ZN" + "VbVtzzRl2VRV3RZV1bZl2xZ+V5Z13zNNWRZV1dZNVbV115Z9X9ZtXZg0zTQ1UVRVTRRV1VRV2zZV" + "17Y1UXRVUVVlWVRVWXZlWfdVV9Z9SxRV1VNN2RVVVbZV2fVtVZZ94XRVXVdl2fdVWRZ+W9eF4fZ9" +
    "4RhV1dZN19V1VZZ9YdZlYbd13yhpmmlqoqiqmiiqqqmqtm2qrq1bouiqoqrKsmeqrqzKsq+rrmzr" + "miiqrqiqsiyqqiyrsqz7qizrtqiquq3KsrCbrqvrtu8LwyzrunCqrq6rsuz7qizruq3rxnHrujB8" + "pinLpqvquqm6um7runHMtm0co6rqvirLwrDKsu/rui+0dSFRVXXdlF3jV2VZ921fd55b94WybTu/" + "rfvKceu60vg5z28cubZtHLNuG7+t+8bzKz9hOI6lZ5q2baqqrZuqq+uybivDrOtCUVV9XZVl3zdd" + "WRdu3zeOW9eNoqrquirLvrDKsjHcxm8cuzAcXds2jlvXnbKtC31jyPcJz2vbxnH7OuP2daOvDAnH" + "jwAAgAEHAIAAE8pAoSErAoA4AQAGIecUUxAqxSB0EFLqIKRUMQYhc05KxRyUUEpqIZTUKsYgVI5J" + "yJyTEkpoKZTSUgehpVBKa6GU1lJrsabUYu0gpBZKaS2U0lpqqcbUWowRYxAy56RkzkkJpbQWSmkt" +
    "c05K56CkDkJKpaQUS0otVsxJyaCj0kFIqaQSU0mptVBKa6WkFktKMbYUW24x1hxKaS2kEltJKcYU" + "U20txpojxiBkzknJnJMSSmktlNJa5ZiUDkJKmYOSSkqtlZJSzJyT0kFIqYOOSkkptpJKTKGU1kpK" + "sYVSWmwx1pxSbDWU0lpJKcaSSmwtxlpbTLV1EFoLpbQWSmmttVZraq3GUEprJaUYS0qxtRZrbjHm" + "GkppraQSW0mpxRZbji3GmlNrNabWam4x5hpbbT3WmnNKrdbUUo0txppjbb3VmnvvIKQWSmktlNJi" + "ai3G1mKtoZTWSiqxlZJabDHm2lqMOZTSYkmpxZJSjC3GmltsuaaWamwx5ppSi7Xm2nNsNfbUWqwt" + "xppTS7XWWnOPufVWAADAgAMAQIAJZaDQkJUAQBQAAEGIUs5JaRByzDkqCULMOSepckxCKSlVzEEI" + "JbXOOSkpxdY5CCWlFksqLcVWaykptRZrLQAAoMABACDABk2JxQEKDVkJAEQBACDGIMQYhAYZpRiD" +
    "0BikFGMQIqUYc05KpRRjzknJGHMOQioZY85BKCmEUEoqKYUQSkklpQIAAAocAAACbNCUWByg0JAV" + "AUAUAABgDGIMMYYgdFQyKhGETEonqYEQWgutddZSa6XFzFpqrbTYQAithdYySyXG1FpmrcSYWisA" + "AOzAAQDswEIoNGQlAJAHAEAYoxRjzjlnEGLMOegcNAgx5hyEDirGnIMOQggVY85BCCGEzDkIIYQQ" + "QuYchBBCCKGDEEIIpZTSQQghhFJK6SCEEEIppXQQQgihlFIKAAAqcAAACLBRZHOCkaBCQ1YCAHkA" + "AIAxSjkHoZRGKcYglJJSoxRjEEpJqXIMQikpxVY5B6GUlFrsIJTSWmw1dhBKaS3GWkNKrcVYa64h" + "pdZirDXX1FqMteaaa0otxlprzbkAANwFBwCwAxtFNicYCSo0ZCUAkAcAgCCkFGOMMYYUYoox55xD" + "CCnFmHPOKaYYc84555RijDnnnHOMMeecc845xphzzjnnHHPOOeecc44555xzzjnnnHPOOeecc845" +
    "55xzzgkAACpwAAAIsFFkc4KRoEJDVgIAqQAAABFWYowxxhgbCDHGGGOMMUYSYowxxhhjbDHGGGOM" + "McaYYowxxhhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4wxxhhjjDHG" + "GFtrrbXWWmuttdZaa6211lprrQBAvwoHAP8HG1ZHOCkaCyw0ZCUAEA4AABjDmHOOOQYdhIYp6KSE" + "DkIIoUNKOSglhFBKKSlzTkpKpaSUWkqZc1JSKiWlllLqIKTUWkottdZaByWl1lJqrbXWOgiltNRa" + "a6212EFIKaXWWostxlBKSq212GKMNYZSUmqtxdhirDGk0lJsLcYYY6yhlNZaazHGGGstKbXWYoy1" + "xlprSam11mKLNdZaCwDgbnAAgEiwcYaVpLPC0eBCQ1YCACEBAARCjDnnnHMQQgghUoox56CDEEII" + "IURKMeYcdBBCCCGEjDHnoIMQQgghhJAx5hx0EEIIIYQQOucchBBCCKGEUkrnHHQQQgghlFBC6SCE" +
    "EEIIoYRSSikdhBBCKKGEUkopJYQQQgmllFJKKaWEEEIIoYQSSimllBBCCKWUUkoppZQSQgghlFJK" + "KaWUUkIIoZRQSimllFJKCCGEUkoppZRSSgkhhFBKKaWUUkopIYQSSimllFJKKaUAAIADBwCAACPo" + "JKPKImw04cIDUGjISgCADAAAcdhq6ynWyCDFnISWS4SQchBiLhFSijlHsWVIGcUY1ZQxpRRTUmvo" + "nGKMUU+dY0oxw6yUVkookYLScqy1dswBAAAgCAAwECEzgUABFBjIAIADhAQpAKCwwNAxXAQE5BIy" + "CgwKx4Rz0mkDABCEyAyRiFgMEhOqgaJiOgBYXGDIB4AMjY20iwvoMsAFXdx1IIQgBCGIxQEUkICD" + "E2544g1PuMEJOkWlDgIAAAAA4AAAHgAAkg0gIiKaOY4Ojw+QEJERkhKTE5QAAAAAALABgA8AgCQF" + "iIiIZo6jw+MDJERkhKTE5AQlAAAAAAAAAAAACAgIAAAAAAAEAAAACAhPZ2dTAAQYOwAAAAAAAOGp" +
    "bkoCAAAAmc74DRgyNjM69TAzOTk74dnLubewsbagmZiNp4d0KbsExSY/I3XUTwJgkeZdn1HY4zoj" + "33/q9DFtv3Ui1/jmx7lCUtPt18/sYf9MkgAsAGRBd3gMGP4sU+qCPYBy9VrA3YqJosW3W2/ef1iO" + "/u3cg8ZG/57jU+pPmbGEJUgkfnaI39DbPqxddZphbMRmCc5rKlkUMkyx8iIoug5dJv1OYH9a59c+" + "3Gevqc7Z2XFdDjL/qHztRfjWEWxJ/aiGezjohu9HsCZdQBKbiH0VtU/3m85lDG2T/+xkZcYnX+E+" + "aqzv/xTgOoTFG+x7SNqQ4N+oAABSxuVXw77Jd5bmmTmuJakX7509HH0kGYKvARPpwfOSAPySPAc2" + "EkneDwB2HwAAJlQDYK5586N79GJCjx4+p6aDUd27XSvRyXLJkIC5YZ1jLv5lpOhZTz0s+DmnF1di" + "ptrnM6UDgIW11Xh8cHTd0/SmbgOAdxcyWwMAAGIrZ3fNSfZbzKiYrK4+tPqtnMVLOeWOG2kVvUY+" +
    "p2PJ/hkCl5aFRO4TLGYPZcIU3vYM1hohS4jHFlnyW/2T5J7kGsShXWT8N05V+3C/GPqJ1QdWisGP" + "xEzHqXISBPIinWDUt7IeJv/f5OtzBxpTzZZQ+CYEhHXfqG4aABQli72GJhN4oJv+hXcApAJSErAW" + "8G2raAX4NUcABnVt77CzZAB+LsHcVe+Q4h+QB1wh/ZrJTPxSBdI8mgTeAdTsQOoFUEng9BHcVPhx" + "SRRYkKWZJXOFYP6V4AEripJoEjXgA2wJRZHSExmJDm8F0A6gEXsg5a4ZsALItrMB7+fh7UKLvYWS" + "dtsDwFf1mzYzS1F82N1h2Oyt2e76B1QdS0SAsQigLPMOgJS9JRC7hFXA6kUsLFNKD5cA5cTRvgSq" + "Pc3Fl99xW3QTi/MHR8DEm6WnvaVQATwRqRKjywQ9BrrhugR2AKTsPQeQckrAOgDOhbTESyrXQ50C" + "kNpXdtWjW7W2/3UjeX3U95gIdalfRAoAmqUEiwp53hCdcCwlg47fcbfzlmQMAgaBkh7c+fcDgF+i" +
    "fwDXfzegLPcLYJsAAJQArTXjnh/uXGy3v1Hk3pV6/3t5ruW81f6prfbM2Q3WNVy98BwUtbCwhFhA" + "WuPev6Oe/4ZaFQUcgKrVs4defzh1TADA1DEh5b3VlDaECw5b+bPfkKos3tIAue3vJZOih3ga3l6O" + "3PSfIkrLv0PAS86PPdL7g8oc2KteNFKKzKRehOv2gJoFLBPXmaXvPBQILgJon0bbWBszrYZYYwE7" + "jl2j+vTdU7Vpk21LiU0QajPkywAAHqbUC0/YsYOdb4e6BOp7E0cCi04Ao/TgD8ZVAMid6h/A8IeB" + "Nkp6/xsAACZELEYIk+yvI6Qz1NN6lIftB/6IMWjWJNOqPTMedAmyaj6Es0QBklJpiSWWHnQ2CoYb" + "GWAmt+0gLQBFKCBnp2QUUQZ/1thtZDBJUpFWY82z34ocorB62oX7qB5y0oPAv/foxH25wVmgIHf2" + "xFOr8leZcBq1Kx3ZvCq9Bga639AxuHuPNL/71YCF4EywJpqHFAX6XF0sjVbuANnvvdLcrufYwOM/" +
    "iDa6iA468AYAAB6mNBMXcgTD8HSRqJ4vw8CjAlCEPACASlX/APwPOJKl9xQAAAPmnev2eWp33Xgy" + "w3Dvfz6myGk3oyP8YTKsCOvzAgALQi0o1c6Nzs2O2Pg2h4ACIJAgAGP0aNn5x0BDgVfH7u2TtyfD" + "cRIuYAyQhBF/lvSRAttgA6TPbWZA9gaUrZWAUEAA+Dx47Q3/r87HxUUqZmB0BmUuMlojFjHt1gDu" + "nnvuX8MImsjSq5WkzSzGS62OEIlOufWWezxWpv6FBgDgJVltfXFYtNAAnqU0xQoD0YLiXo5cF5QV" + "4CnY1tBLAkZCOABAhbk/AM+/AwSCCdlWAAAMcFjS7owb8GVDzveDiZvznbt2tF4bL5odN1YKl88T" + "AEABCZvufq9YCTBtMwVAQUEAwGtNltzSaHvADYC3TxLVjqiRA+OZAMhzcqEgRcAOwoCgvdTxsTHL" + "QEF6+oOb2+PAI8ciPQcXg7pOY+LjxQSv2fjmFuj34gGwz310/bGK6z3xgT887eomWULEaDd04wHe" +
    "tYxdjcgV2SxvSwn0VoZXJRqkRC5ASQ/muVoAUsX7AgAQMBNaVwAAlABRxT/1PmfqLqSRNDbhXb07" + "berpB3b94jpuWEZjBCD2OcdXFpCKEgCDfcFPMw8AAADUwT4lnUm50lmwrpMMhPQIKj6u0E8fr2vG" + "BngMNdIlrZsigjahljud6AFVg+tzXwUnXL3TJLpajaWKA4VAAAAMiFfqJgKAZ08XrtS3dxtQNYcp" + "PvYEG8ClvrQRJgBephwnNWJjtGqmp6VEPSvBe7EBiU3qgJbQAwD4Le8LAMDMhHbNAAAlgK+tFs5O" + "+YyJc9yCnJa3rxLPulGnxwsXV9Fsk2k4PisCAHC8FkwbGE9gJQAAoMnyksj0CdFMZLLgoz8M+Fxz" + "iwYBgIx+zHiCBAKAlBKNpF1sO9JpVcyEi9ar15YlHgrut5fPJnkdJ6vEwZPyAHQBIEDUrlMcBAAd" + "2KAS0Qq+JwRsE4AJZtMnAD6GnOYwYlOIZvtzUNdjreB7fiMkWI0CmBB6AIAKc38A9osEFlTSGECB" +
    "+cbeRDC0aRpLHqNPplcK/76Lxn2rpmqyXsYJWRi/FQAAAKBQk9MCAOibrQBQADCDsqpooPutd+05" + "Ce9g6iEdiYXgVmQAI4+4wskEBEiBloNQ6Ki0/KTQ0QjWfjxzi+AeuXKoMjEVfQOZzr0y941qLgM2" + "AExvbZOqcxZ6J6krlrj4y2j9AdgKDx6GnJsVLhbc42uq584+ouSdNBpoCiCVHrz+WzUA/DDtD8AT" + "gA3h0lMCAAzcFv+S+fSSNkeYWlTpb34mf2RfmqqJeMeklhHAfu7VoAEACgAApKRktL+KkQDWMwYC" + "UAAAAHCKsp80xhp91UjqQBw3x45cetqkjQEyu3G9B6N+R650Uq8OVig7wOm6Wun0ea4lKDPoabJs" + "6aLqgbhPzpv4KR4iODilw88ZpY7q1IOMcbASAOAVtmcCnobcrkG4KGS7/ZnskVWRNF9J0RUHKOnB" + "yy9WA8Dv6L4AAARMCQUA4GritfVM2lcZfH3Q3T/vZ47J2YHhcmBazjfdyuV25gLAzrc0cwAAAAAY" +
    "Ch6PdwAAAGyWjFW4yScjaWa2mGcofHxWxewKALglWBpLUvwwk+UOh5eNGyUOs1/EF+pZr+ud5Ozo" + "GwYdAABg2p52LiSgAY/ZVlOmilEgHn6G3OcwYjzI7vOj1t6xsx4S3lBY96EUQBF6AIBAmPYH4PoG" + "YCoJAADWe+OZJZi7/x76/yH7Lzf9M5XzRKnFPmveMsilQHwVAAAAAKB3LQD8PCIAAADga0QujBLy" + "wzeJ4a6Z/ERVBAUlAEDqvoM7BQBAuAguzFqILtmjH3Kd4wfKobnOhA3z85qWoRPm9hwoOHoDAAlC" + "bwDAA56FHAuXflHo3fe2ttG9XUDeA9YmYCBQ0oPr/1QC8IvuCwAAApbUAQCK22MmE3O78VAbHQT9" + "PIPNoT9zNc3l2Oe7TAVLANBufT8MAQAAAGzT4PS8AQAAoELGHb2uaCwwEv1EWhFriUkbAaAZ27/f" + "VZnTZXbWz3BwWpjUaMZKRj7dZ0J//gUeTdpVEwAAZOFsNxKAjQSgA+ABPoY8Jj5y2wje81jsXc/1" +
    "TOQWTDYZBmAkNDiqVwuA2NJ9AQAAEBKAt9Vrsfs/2N19MO91S9rd8EHTZHnzC5MYmfQEACy/FBcA" + "AADA5c4gi4z8RANs/m6FNXVo9DV46JG1BBDukqlw/Va5G7QbuGVSI+2aZaoLXJrdVj2zlC9Z5QEA" + "EFz/5QzgVZwAAAAA/oXcxyC6WfTu+09Ve/c766J4VTAGUFmA51+VANKi/QPoPwYgYAkA715OH4S0" + "s5KDHvj99MMq8TPFc3roKZnGOoT1bmIhVgc7XAMBAAAAAMAW1VbQw3gapzOpJd+Kd2fc4iSO62fJ" + "v9+movui1wUNPAj059N3OVxzk4gV73PmE8FIA2F5mRq37Evc76vLXfF4rD5UJJAw46hW6LZCb5sN" + "Ldx+kzMCAAB+hfy95+965ZCLP7B3/VlTHCvDEKtQhTm4KiCgAEAbrfbWTPssAAAAXpee1tVrozYY" + "n41wD1aeYtkKfswN5/SXPO0JDnhO/4laUortv/s412fybe/nONdncoCHnBVliu0CQGBWlPY/5Kwo" +
    "m2L/kruPM6Q7oz4tvDQy+bZ3HzOi+gNHA4DZEgA=" + "");
lib.resource.add("hterm/concat/date", "text/plain", "Sat, 10 Sep 2016 08:51:57 +0000" + "");
lib.resource.add("hterm/changelog/version", "text/plain", "1.58" + "");
lib.resource.add("hterm/changelog/date", "text/plain", "2016-07-12" + "");
lib.resource.add("hterm/git/HEAD", "text/plain", "49f8641dd055afaad9eadcd8553804eff0dd2637" + "");