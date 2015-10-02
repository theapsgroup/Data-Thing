
function keys(obj) {
    return Object.keys(obj);
}
function values(obj) {
    return keys(obj).map(function(key) {
        return obj[key];
    });
}

(function() {
    var inputMode, scriptMode, outputMode;
    function assertNonEmptyArray(arr,msg) {
        if (!(arr && arr instanceof Array)) {
            throw(new Error(msg||'please provide an array'));
        }
        if (!arr.length) {
            throw(new Error(msg||'empty array provided'));
        }
    }

    function assertArrayOfStrings(arr,msg) {
        assertNonEmptyArray(arr);
        if (typeof arr[0] !== 'string') {
            throw(new Error(msg||'please provide an array of strings'));
        }
    }

    function assertArrayOfObjects(arr,msg) {
        assertNonEmptyArray(arr);
        if (typeof arr[0] !== 'object') {
            throw(new Error(msg||'please provide an array of objects'));
        }
    }

    function assertNotEmpty(str,msg) {
        if (!str) {
            throw(new Error(msg||'Argument should not be empty'));
        }
    }

    //tsv generator
    window.makeTSV = function(arr) {
        assertArrayOfObjects(arr);
        var header = Object.keys(arr[0]).join('\t');
        var lines = arr.map(function(obj) {
            return values(obj).join('\t');
        });
        return [header].concat(lines);
    };
    //sql INSERT generator
    window.makeSQLInsert = function(arr,tableName) {
        assertArrayOfObjects(arr);
        assertNotEmpty(tableName,'Table name should be given like: makeSQLInsert(input,\'users\');')
        return arr.map(function(obj) {
            var cols = keys(obj).map(SqlEscape.ident);
            var vals = values(obj).map(SqlEscape.literal);
            var name = SqlEscape.ident(tableName);
            return [
                'INSERT INTO ',
                name,
                ' (',
                cols.join(','),
                ') VALUES (',
                vals.join(','),
                ');'
            ].join('');
        });
    };
    //sql UPDATE generator
    window.makeSQLUpdate = function(arr,tableName,key) {
        assertArrayOfObjects(arr);
        assertNotEmpty(tableName,'Table name should be given like: makeSQLUpdate(input,\'users\',\'id\');');
        assertNotEmpty(key,'Key field should be given like: makeSQLUpdate(input,\'users\',\'id\');');
        return arr.map(function(obj) {
            var cols = keys(obj).map(SqlEscape.ident);
            var vals = values(obj).map(SqlEscape.literal);
            var name = SqlEscape.ident(tableName);
            return [
                'UPDATE ',
                name,
                ' SET ',
                cols.map(function(col,i) {
                    return col+'='+vals[i];
                }).join(','),
                ' WHERE ',
                SqlEscape.ident(key),
                '=',
                SqlEscape.literal(obj[key]),
                ';'
            ].join('');
        });
    };

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
        "yaml": {
            editorMode: "ace/mode/yaml",
            mime: "application/x-yaml;charset=utf-8",
            extension: ".yml",
            parse: function(str) {
                return jsyaml.load(str);
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
                assertArrayOfStrings(arr);
                return (arr||[]).join('\n');
            }
        },
        "xml": {
            editorMode: "ace/mode/xml",
            mime: "application/xml;charset=utf-8",
            extension: ".xml",
            parse: function (str) {
                return JsonML.fromXMLText(str);
            },
            serialize: function(jsonml) {
                return formatXml(JsonML.toXMLText(jsonml));
            }
        },
        "tsv": {
            editorMode: "ace/mode/plain_text",
            mime: "text/plain;charset=utf-8",
            extension: ".tsv",
            parse: function(str) {
                //array of arrays
                var lines = str.split(/\r\n|\r|\n/g);
                return lines.map(function(line) {
                    return line.split(/\t/g);
                });
            }
        },
        "tsvh": {
            editorMode: "ace/mode/plain_text",
            mime: "text/plain;charset=utf-8",
            extension: ".tsv",
            parse: function(str) {
                //array of objects
                var lines = str.split(/\r\n|\r|\n/g);
                var headers = lines.shift().split(/\t/g);
                return lines.map(function(line) {
                    var cells = line.split(/\t/g);
                    return cells.reduce(function(obj,cell,index) {
                        obj[headers[index]] = cell;
                        return obj;
                    },{});
                });
            }
        }
    };

    var scriptModes = {
        "js": {
            editorMode: "ace/mode/javascript",
            mime: "text/js;charset=utf-8",
            extension: ".js",
            transform: function(script,input) {
                var fn = new Function('input',script);
                return fn(input);
            }
        },
        "xsl": {
            editorMode: "ace/mode/xml",
            mime: "application/xml;charset=utf-8",
            extension: ".xsl",
            transform: function(script,input) {
                //input is jsonml, create xml document
                var inputDoc = Saxon.parseXML(JsonML.toXMLText(input));
                var xslDoc = Saxon.parseXML(script);
                var proc = Saxon.newXSLT20Processor(xslDoc);
                var outputDoc = proc.transformToDocument(inputDoc);
                //return jsonml again
                var output = JsonML.fromXMLText(Saxon.serializeXML(outputDoc));
                return output;
            }
        }
    }

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
        editor.$blockScrolling = Infinity;
        return editor
    }


    /************* helpers ************/

    //editor mode helpers
    function setEditorMode(editor,mode) {
        editor.getSession().setMode(mode.editorMode);
    }

    function setInputMode(_mode) {
        inputMode = modes[_mode];
        document.getElementById('inputMode').value = _mode;
        setEditorMode(inputEditor,inputMode);
    }

    function setScriptMode(_mode) {
        scriptMode = scriptModes[_mode];
        document.getElementById('scriptMode').value = _mode;
        setEditorMode(scriptEditor,scriptMode);
    }

    function setOutputMode(_mode) {
        outputMode = modes[_mode];
        document.getElementById('outputMode').value = _mode;
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

    function formatXml(xml) {
        return vkbeautify.xml(xml);
    }

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
    //saveScriptStorage
    function saveScriptStorage(str) {
        writeStorage('script')(str);
    }
    function saveScriptDownload(str) {
        writeDownload(
            document.getElementById('rawScript'),
            scriptMode.mime,
            'script'+scriptMode.extension
        )(str);
    }
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
        setScriptMode(document.getElementById('scriptMode').value);
        setOutputMode(document.getElementById('outputMode').value);
        handleChange();
    }

    //editor change handler
    function handleEditorChange() {
        handleChange();
    }

    function transform(script,input) {
        return scriptMode.transform(script,input);
    }

    //TODO: more error handling
    function handleChange() {
        clearError();
        //convert input to json, using mode parser
        var input = inputEditor.getValue();
        saveInputStorage(input);
        try {
            var inputJSON = inputMode.parse(input);
        } catch(e) {
            handleError(e.message);
            var inputJSON = e.message;
        }
        //convert script to function
        var script = scriptEditor.getValue();
        saveScriptStorage(script);
        saveScriptDownload(script);
        try {
            //execute function
            var outputJSON = transform(script,inputJSON);
            //convert output to text, using mode serializer
            var output = outputMode.serialize(outputJSON);
        } catch(e) {
            handleError(e.message);
            var output = 'Error: '+e.message;
        }
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
    document.getElementById('scriptMode').addEventListener('change', handleModeChange, false);
    document.getElementById('outputMode').addEventListener('change', handleModeChange, false);
    document.getElementById('inputFile').addEventListener('change', handleInputFileChange, false);
    document.getElementById('scriptFile').addEventListener('change', handleScriptFileChange, false);

    document.getElementById('saveGist').addEventListener('click',saveGist, false);

    inputEditor.on('change',throttle(handleEditorChange));
    scriptEditor.on('change',throttle(handleEditorChange));

    setInputMode('json');
    setOutputMode('json');
    setScriptMode('js');

    //saving an anonymous gist
    function saveGist() {
        var url = 'https://api.github.com/gists';
        var data = {
            "description": "The APS Group data-thing",
            "public": false,
            "files": {}
        }
        data.files['input'+inputMode.extension] = {
            content: inputEditor.getValue()
        };
        data.files['script'+scriptMode.extension] = {
            content: scriptEditor.getValue()
        };

        //post data
        fetch(url,{
            method: 'post',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        }).then(function(resp) {
            return resp.json();
        }).then(function(data) {
            window.location.hash = data.id;
        });
    }

    window.onload = function() {
        if (location.hash) {
            // fetching a gist
            var id = location.hash.split('#')[1];
            if (id) {
                fetch('https://api.github.com/gists/'+id).then(function(resp) {
                    return resp.json();
                }).then(function(data) {
                    if (data.files['input.json']) {
                        loadInput(data.files['input.json'].content);
                        setInputMode('json');
                    }
                    if (data.files['input.yml']) {
                        loadInput(data.files['input.yml'].content);
                        setInputMode('yaml');
                    }
                    if (data.files['input.txt']) {
                        loadInput(data.files['input.txt'].content);
                        setInputMode('text');
                    }
                    if (data.files['input.xml']) {
                        loadInput(data.files['input.xml'].content);
                        setInputMode('xml');
                    }
                    if (data.files['input.tsv']) {
                        loadInput(data.files['input.tsv'].content);
                        setInputMode('tsvh');
                    }
                    if (data.files['script.js']) {
                        loadScript(data.files['script.js'].content);
                        setScriptMode('js');
                        setOutputMode('json');
                    }
                    if (data.files['script.xsl']) {
                        loadScript(data.files['script.xsl'].content);
                        setScriptMode('xsl');
                        setOutputMode('xml');
                    }
                });
            }
        } else {
            //load from storage if available
            if (localStorage.input) {
                loadInputStorage();
            }
            if (localStorage.script) {
                loadScriptStorage();
            }
        }
    }
}());