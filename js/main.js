var inputMode, outputMode;
var modes = {
    "json": {
        editorMode: "ace/mode/javascript",
        mime: "application/json;charset=utf-8",
        extension: ".json",
        parse: function(str) {
            return JSON.parse(str);
        },
        serialize: function(json) {
            return (JSON.stringify(json,null,2)||'undefined');
        }
    },
    "text": {
        editorMode: "ace/mode/plain_text",
        mime: "text/plain;charset=utf-8",
        extension: ".txt",
        parse: function(str) {
            return str.split(/\r\n|\r|\n/g);
        },
        serialize: function(arr) {
            return (arr||[]).join('\n');
        }
    }
};

/**
 * goal with modes
 * allow json, text and xml as input language
 * allow js, xsl as transformation language
 * allow json, text and xml as output language
 *
 * input transformations
 * text -> json (as array of lines) for js transform
 * xml -> json (as jxon? see note) for js transform
 * text -> xml (as document of lines) for xsl transform
 * json -> xml (from jxon) for xsl transform
 *
 * output transformations
 * json -> text (from array)
 * xml -> text (innerText)
 * json -> xml (from jxon)
 * xml -> json (as jxon)
 *
 * xml to json conversion should be bidirectional. Candidates:
 * - jxon: https://developer.mozilla.org/en-US/docs/JXON#Appendix.3A_a_complete.2C_bidirectional.2C_JXON_library
 * - jsonml: http://www.jsonml.org/
 *
 *
 * FORNOW: use json as common interface language, i.e. script gets json and returns json
 * When xslt is (later) used as transform language, interpret json as jsonml coded xml
 * and return jsonml coded xml
 * 
 */

var inputEditor = createEditor('inputTree');
var scriptEditor = createEditor('scriptBox');
var outputEditor = createEditor('outputTree',true);

function createEditor(el,readonly) {
    var editor = ace.edit(el);
    editor.setTheme("ace/theme/monokai");
    editor.setReadOnly(readonly||false);
    editor.getSession().setMode("ace/mode/javascript");
    // editor.getSession().setMode("ace/mode/xml");
    editor.$blockScrolling = Infinity;
    return editor
}

function focus() {
    // document.getElementById('script').focus();
}


/************* helpers ************/

//editor mode helpers
function setEditorMode(editor,mode) {
    editor.getSession().setMode(mode.editorMode);
}

function setInputMode(_mode) {
    inputMode = modes[_mode];
    setEditorMode(inputEditor,inputMode);
}

function setOutputMode(_mode) {
    outputMode = modes[_mode];
    setEditorMode(outputEditor,outputMode);
}

//read a file, return promise for the file as text
function readFile(fn) {
    return Q.Promise(function(resolve, reject) {
        var r = new FileReader();
        r.onload = function(e) {
            var contents = e.target.result;
            localStorage.inputJSON = contents;
            resolve(e.target.result);
        }
        r.readAsText(fn);
    });
}

function readStorage(key) {
    return Q.when(localStorage[key]);
}

function writeStorage(key) {
    return function(value) {
        localStorage[key] = value;
    }
}

function writeDownload(element,mime,filename) {
    return function(value) {
        var dataurl = [
            'data:',
            mime,
            ',',
            encodeURI(value)
        ].join('');
        element.href = dataurl;
        element.download = filename;
    }
}

//make an element droppable to accept files
//when file is dropped, ondrop is called with the file name
function makeDroppable(element,ondrop) {
    element.ondragover = function () {
        element.classList.add('hover');
        return false;
    };
    element.ondragend = function () {
        element.classList.remove('hover');
        return false;
    };
    element.ondrop = function(e) {
        e.preventDefault();
        element.classList.remove('hover');

        ondrop(e.dataTransfer.files[0]);
    };
}

//from underscore, throttle function
var throttle = (function() {
    var _now = Date.now || function() {
        return new Date().getTime();
    };
    function throttle(func, wait, options) {
        var context, args, result;
        var timeout = null;
        var previous = 0;
        if (!options) options = {};
        var later = function() {
          previous = options.leading === false ? 0 : _now();
          timeout = null;
          result = func.apply(context, args);
          if (!timeout) context = args = null;
        };
        return function() {
          var now = _now();
          if (!previous && options.leading === false) previous = now;
          var remaining = wait - (now - previous);
          context = this;
          args = arguments;
          if (remaining <= 0 || remaining > wait) {
            if (timeout) {
              clearTimeout(timeout);
              timeout = null;
            }
            previous = now;
            result = func.apply(context, args);
            if (!timeout) context = args = null;
          } else if (!timeout && options.trailing !== false) {
            timeout = setTimeout(later, remaining);
          }
          return result;
        };
    };

    return throttle;
}());


/************* loaders *************/

//load - loads string in editor
function createLoader(editor) {
    return function load(str) {
        editor.setValue(str);
        editor.clearSelection();
        return str;
    }
}

//loadInput - loads from given string
function loadInput(str) {
    var loader = createLoader(inputEditor);
    return loader(str);
}
//loadInputFile - loads from given filename
function loadInputFile(filename) {
    return readFile(filename).then(loadInput);
}
//loadInputStorage - loads from localstorage
function loadInputStorage() {
    return readStorage('input').then(loadInput);
}
//loadScript
function loadScript(str) {
    var loader = createLoader(scriptEditor);
    return loader(str);
}
//loadScriptFile
function loadScriptFile(filename) {
    return readFile(filename).then(loadScript);
}
//loadScriptStorage
function loadScriptStorage() {
    return readStorage('script').then(loadScript);
}

function loadOutput(str) {
    var loader = createLoader(outputEditor);
    return loader(str);
}

//savers

function saveInputStorage(str) {
    writeStorage('input')(str);
}
//saveScriptFile
//saveScriptStorage
function saveScriptStorage(str) {
    writeStorage('script')(str);
}
function saveScriptDownload(str) {
    writeDownload(
        document.getElementById('rawScript'),
        'text/js;charset=utf-8',
        'script.js'
    )(str);
}
//saveOutputFile
//saveOutputStorage
function saveOutputDownload(str) {
    writeDownload(
        document.getElementById('rawOutput'),
        outputMode.mime,
        'raw'+outputMode.extension
    )(str);
}

/************* change handlers ***************/

function handleError(msg) {
    var err = document.getElementById('error');
    err.innerHTML = 'error in script: '+msg;
    err.classList.add('visible');
}

function clearError() {
    var err = document.getElementById('error').classList.remove('visible');
}

//generic file input change handler
function createFileInputChangeHandler(handler) {
    return function(evt) {
        var f = evt.target.files[0];

        if (f) {
            handler(f);
        } else {
            alert("Failed to load file");
        }
    }
}

//handler for input file
var handleInputFileChange = createFileInputChangeHandler(function(f) {
    loadInputFile(f).done();
});

//handler for script file
var handleScriptFileChange = createFileInputChangeHandler(function(f) {
    loadScriptFile(f).done();
});

//handler for mode change dropdown
function handleModeChange() {
    setInputMode(document.getElementById('inputMode').value);
    setOutputMode(document.getElementById('outputMode').value);
    handleChange();
}

//editor change handler
function handleEditorChange() {
    handleChange();
}

function transformJS(script,input) {
    try {
        var fn = new Function('input',script);
        return fn(input);
    } catch(e) {
        handleError(e.message);
        return e.message;
    }
}

}

//TODO: more error handling
function handleChange() {
    clearError();
    //convert input to json, using mode parser
    var input = inputEditor.getValue();
    saveInputStorage(input);
    var inputJSON = inputMode.parse(input);
    //convert script to function
    var script = scriptEditor.getValue();
    saveScriptStorage(script);
    saveScriptDownload(script);
    //execute function
    var outputJSON = transformJS(script,inputJSON);
    //convert output to text, using mode serializer
    var output = outputMode.serialize(outputJSON);
    //write output
    loadOutput(output);
    saveOutputDownload(output);
}

/*********** setup *************/

//enable dropping of files
makeDroppable(document.getElementById('inputTree'),function(file) {
    loadInputFile(file)
        .done();
});
makeDroppable(document.getElementById('scriptBox'),function(file) {
    loadScriptFile(file)
        .done();
});

document.getElementById('inputMode').addEventListener('change', handleModeChange, false);
document.getElementById('outputMode').addEventListener('change', handleModeChange, false);
document.getElementById('inputFile').addEventListener('change', handleInputFileChange, false);
document.getElementById('scriptFile').addEventListener('change', handleScriptFileChange, false);

inputEditor.on('change',throttle(handleEditorChange));
scriptEditor.on('change',throttle(handleEditorChange));

setInputMode('json');
setOutputMode('json');

//load from storage if available
if (localStorage.input) {
    loadInputStorage();
}
if (localStorage.script) {
    loadScriptStorage();
}