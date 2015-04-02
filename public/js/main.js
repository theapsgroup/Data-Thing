var input;

var inputEditor = createEditor('inputTree',true);
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

function readSingleFile(evt) {
    //Retrieve the first (and only!) File from the FileList object
    var f = evt.target.files[0];

    if (f) {
        readFile(f)
            .then(showInput)
            .done();
    } else {
        alert("Failed to load file");
    }
}

function focus() {
    document.getElementById('script').focus();
}

//enable dropping of files
var it = document.getElementById('inputTree');
it.ondragover = function () {
    it.classList.add('hover');
    return false;
};
it.ondragend = function () {
    it.classList.remove('hover');
    return false;
};
it.ondrop = function(e) {
    e.preventDefault();
    it.classList.remove('hover');

    var file = e.dataTransfer.files[0];
    readFile(file)
        .then(showInput)
        .done();
}

function showInput(str) {
    return Q.when(str)
        .then(parseJSON())
        .then(function(json) {
            input = json;
            return json;
        })
        .then(renderJSON(inputEditor))
        .then(process)
        .then(focus);
}


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

function parseJSON() {
    return function(str) {
        return JSON.parse(str);
    }
}

function renderJSON(editor) {
    return function(json) {
        var src = (JSON.stringify(json,null,2)||'undefined');
        editor.setValue(src);
        editor.clearSelection();
        return json;
    }
}

function process() {
    var err = document.getElementById('error');
    err.classList.remove('visible');
    return Q.when(function() {
        var script = scriptEditor.getValue();
        localStorage.inputScript = script;
        return new Function('input',script);
    }).then(function(factory) {
        return factory();
    }).fail(function(e) {
        err.innerHTML = 'error in script: '+e.message;
        err.classList.add('visible');
        return function(input){return input;}
    }).then(function(fn) {
        return fn(input);
    }).fail(function(e) {
        err.innerHTML = 'error executing script: '+e.message;
        err.classList.add('visible');
    }).then(function(json) {
        var dataurl = [
            'data:',
            'application/json;charset=utf-8,',
            JSON.stringify(json)
        ].join('');
        document.getElementById('raw').href = dataurl;
        return json;
    }).then(renderJSON(outputEditor))
    .fail(function(err) {
        console.log(err.message);
        return input;
    });
}


//from underscore
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

document.getElementById('input').addEventListener('change', readSingleFile, false);
scriptEditor.on('change',throttle(process));

if (localStorage.inputScript) {
    scriptEditor.setValue(localStorage.inputScript);
    scriptEditor.clearSelection();
}
if (localStorage.inputJSON) {
    showInput(localStorage.inputJSON);
}
