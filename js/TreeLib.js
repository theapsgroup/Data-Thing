(function exporter(root, name, factory) {
    if (typeof exports === 'object') {
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        define([],factory);
    } else {
        root[name] = factory();
  }
}(this, 'TreeLib', function factory() {

    function getChildren(tree,childrenProp) {
        var childrenFn;
        if (typeof childrenProp === 'string' || childrenProp === undefined) {
            childrenFn = function(item) {
                return item[childrenProp||'children'];
            };
        } else {
            childrenFn = childrenProp;
        }
        return childrenFn(tree)||[];
    }

    /**
     * depth first tree walker
     * @param  {object||array}   tree     the tree to walk, can be an object or
     * an array, in which case there is no root node
     * @param  {Function(node,depth,path)} callback gets the tree node, depth and path as arguments
     * @param  {String}   children (optional) attribute containing children, defaults to 'children'
     */
    function walk(tree,callback,children) {
        function _walk(tree,depth,path) {
            if (!(tree instanceof Array)) {
                //callback on the node
                path.push(tree);
                callback(tree,depth,path);
                depth+=1;
                //set subtree to empty array if not exists
                tree = getChildren(tree,children);
            }
            //recurse the subtree
            tree.forEach(function(child) {
                _walk(child,depth,path.slice());
            });
        }

        _walk(tree,0,[]);
    }

    /**
     * reverse walk, visits the deepest nodes first and walks back up the tree
     * the callback method takes a node, depth and result set of the deeper
     * callbacks. This walker can thus be used to count children or apply a
     * reduce method up the tree
     * @param  {object||array}   tree     the tree to walk, can be an object or undefined, in which case there is no root node
     * @param  {Function(node,depth,res)} callback callback gets the tree node, depth
     * and result of deeper callbacks
     * @param  {String}   children (optional) attribute containing children, defaults to 'children'
     * @return {mixed}            result of the last callback(s)
     */
    function reverseWalk(tree,callback,children) {
        function _walk(tree,depth) {
            var sub = getChildren(tree,children);
            var res = [];
            sub.forEach(function(child) {
                var r = _walk(child,depth+1);
                if (r!==undefined) {
                    res.push(r);
                }
            });

            return callback(tree,depth,res.length?res:undefined);
        }

        if (tree instanceof Array) {
            var res = [];
            tree.forEach(function(child) {
                res.push(_walk(child,0));
            });
            return res;
        } else {
            return _walk(tree,0);
        }
    }

    function map(tree,callback,children) {
        //maps node or array of nodes
        function _map(node,depth) {
            if (node instanceof Array) {
                return node.map(function(child) {
                    return _map(child,depth);
                });
            } else {
                var childs = getChildren(node,children);
                console.log(childs.length);
                var n = callback(node,depth);
                if (childs) {
                    n.children = _map(childs,depth+1);
                }
                return n;
            }
        }

        return _map(tree,0);
    }

    /**
     * copy function from angular.copy
     * @param  {[type]} source      [description]
     * @param  {[type]} destination [description]
     * @return {[type]}             [description]
     */
    function copy(source){
        var destination;
        if (source instanceof Array) {
            destination = [];
            for (var i = 0; i < source.length; i++) {
                destination.push(copy(source[i]));
            }
        } else if (source !== null && typeof source == 'object') {
            destination = {};
            for (var key in source) {
                destination[key] = copy(source[key]);
            }
        } else {
            return source;
        }
        return destination;
    }

    function filter(tree,callback,children) {
        tree = copy(tree);
        children = children||'children';

        function purge(node,children) {
            //remove empty children
            var childrenArr = getChildren(node,children);
            if (!childrenArr.length) {
                //todo multilevel purge
                for (prop in node) {
                    if (node[prop] === childrenArr) {
                        delete node[prop]
                    }
                }
            }
        }

        function _filterNode(node,children) {
            //filter children
            var childrenArr = getChildren(node,children);
            var filtered = filter(childrenArr,callback,children);
            childrenArr.splice.apply(childrenArr,[].concat(0,Number.MAX_VALUE,filtered));
            purge(node,children);
            return node;
        }

        if (!(tree instanceof Array)) {
            return _filterNode(tree,children);
        }
        return tree.filter(function(node) {
            _filterNode(node,children);
            var childrenArr = getChildren(node,children);
            return (callback(node) || childrenArr.length);
        });
    }

    /**
     * depth first flatten tree, children are maintained
     * @param  {object|array} tree     tree to flatten, or array of trees
     * @param  {String} children (optional) attribute containing the children, defaults to 'children'
     * @return {Array}          array of nodes
     */
    function flatten(tree,children) {
        var res = [];
        walk(tree,function(node) {
            res.push(node);
        },children);
        return res;
    }

    function paths(tree,children) {
        var res = [];
        walk(tree,function(node,depth,path) {
            res.push(path);
        },children);
        return res;
    }

    function levels(tree,children) {
        var res = [];
        walk(tree,function(node,depth,path) {
            if (!res[depth]) {
                res[depth] = [];
            }
            res[depth].push(node);
        },children);
        return res;
    }

    /**
     * Object wrapper for the tree, exposing the TreeLib functions as methods
     * @param {object||array} tree     tree
     * @param {String} children (optional) attribute containing the children, defaults to 'children'
     */
    function Tree(tree,children) {
        this.tree = tree;
        this.childrenProp = children||'children';
    }

    Tree.prototype.walk = function(callback) {
        walk(this.tree,callback,this.childrenProp);
        return this;
    };

    Tree.prototype.reverseWalk = function(callback) {
        reverseWalk(this.tree,callback,this.childrenProp);
        return this;
    };

    Tree.prototype.map = function(callback) {
        return map(this.tree,callback,this.childrenProp);
    };

    Tree.prototype.filter = function(callback) {
        return filter(this.tree,callback,this.childrenProp);
    };

    Tree.prototype.flatten = function() {
        return flatten(this.tree,this.childrenProp);
    };

    Tree.prototype.paths = function() {
        return paths(this.tree,this.childrenProp);
    };

    Tree.prototype.levels = function() {
        return levels(this.tree,this.childrenProp);
    };

    return {
        walk: walk,
        reverseWalk: reverseWalk,
        map: map,
        flatten: flatten,
        paths: paths,
        levels: levels,
        filter: filter,
        copy: copy,
        Tree: Tree
    };
}));
