var assert = require('assert'),
    FileWalker = require('../../'),
    path = require('path');
    
var fileWalker = new FileWalker(),
    itemsFound;

function trimPath(path) {
    return path.substr(__dirname.length);
}

function reset() {
    fileWalker.reset();
    itemsFound = {};
}

function start(testFunc) {
    setTimeout(testFunc, 0);
}

///////////////////////////////////////////////////////////////////////////////////////

function test1() {
    reset();
    fileWalker
        .on('fileOrDir', function(path) {
            path = trimPath(path);
            itemsFound[path] = true;
        })
        .on('end', function(path) {
            path = trimPath(path);
            assert.equal(path, '/folder1');
            assert.deepEqual(
                itemsFound,
                {
                    '/folder1': true,
                    '/folder1/folder2': true,
                    '/folder1/file1.js': true,
                    '/folder1/file2.txt': true,
                    '/folder1/folder1': true,
                    '/folder1/folder1/file1.js': true,
                    '/folder1/folder1/folder1': true,
                    '/folder1/folder1/folder1/file1.js': true 
                }
            );
            start(test2);
        })
        .walk(path.resolve('./folder1'));   
}

///////////////////////////////////////////////////////////////////////////////////////

function test2() {
    reset();
    fileWalker
        .on('fileRead', function(path) {
            throw new Error('This event should not be fired');
        })
        .on('end', function(path) {
            start(test3);
        })
        .walk(path.resolve('./folder1'));   
}

///////////////////////////////////////////////////////////////////////////////////////

function test3() {
    reset();
    fileWalker
        .on('fileRead', function(path, data) {
            path = trimPath(path);
            itemsFound[path] = data;
        })
        .on('end', function(path) {
            var key;
            
            path = trimPath(path);
            assert.equal(path, '/folder1');
            for(key in itemsFound) {
                assert.equal(key, itemsFound[key]);
            }
            
            start(test4);
        })
        .walk(path.resolve('./folder1'), FileWalker.RECURSIVE, 'utf8');
}

///////////////////////////////////////////////////////////////////////////////////////

function test4() {
    reset();
    fileWalker
        .once('idle', function() {
            fileWalker.walk(path.resolve('./folder1'));
            fileWalker.once('idle', function() {    
                throw new Error('This event should not be fired');
            });
        })
        .once('end', function() {
            fileWalker.removeAllListeners('idle');
            fileWalker.on('idle', function() {
                fileWalker.removeAllListeners('idle');
                start(test5);
            });
        });
}

///////////////////////////////////////////////////////////////////////////////////////

function test5() {
    assert.ok(fileWalker.listeners('idle').length === 0);
    assert.ok(fileWalker.listeners('end').length === 0);
    
    fileWalker
        .on('fileOrDir', function() {
            throw new Error('This event should not be fired');
        })
        .walk(path.resolve('./folder1/folder1'));
    fileWalker.stop(path.resolve('./folder1/folder1'));
    
    start(test6);
}

///////////////////////////////////////////////////////////////////////////////////////

function test6() {
    var currentPath,
        times = 0;
    
    reset();
    fileWalker
        .on('fileOrDir', function(path) {
            path = trimPath(path);
            currentPath = path.substr(0, '/folder1/folder1'.length);
        })
        .on('end', function(path) {
            times++;
            path = trimPath(path);
            assert.ok(currentPath === path);
            if(times === 2) {
                start(test7);
            }
        })
        .walk(path.resolve('./folder1/folder1'));
    fileWalker
        .once('idle', function() {
            assert.ok(times === 1);
        })
        .walkWhenIdle(path.resolve('./folder1/folder2'));
}

///////////////////////////////////////////////////////////////////////////////////////

function test7() {
    reset();
    fileWalker.dirFilter = function(dirName) {
        return /1$/gi.test(dirName);
    };
    fileWalker
        .on('dir', function(path) {
            path = trimPath(path);
            assert.equal(path.match('folder2'), null);
        })
        .once('end', function() {
            start(test8);
        })
        .walk(path.resolve('./folder1'));
}

///////////////////////////////////////////////////////////////////////////////////////

function test8() {
    reset();
    fileWalker.fileFilter = function(fileName) {
        return /\.txt$/gi.test(fileName);
    };
    fileWalker
        .on('file', function(path) {
            path = trimPath(path);
            assert.ok(path.match('.txt') !== null);
        })
        .once('end', function() {
            start(test9);
        })
        .walk(path.resolve('./folder1'));
}

///////////////////////////////////////////////////////////////////////////////////////

function test9() {
    reset();
    var otherFileWalker = new FileWalker();
    
    fileWalker
        .on('file', function() {});
    assert.ok(fileWalker.listeners('file').length !== otherFileWalker.listeners('file').length);
    
    start(test10);
}

///////////////////////////////////////////////////////////////////////////////////////

function test10() {
    var error = false;
    
    reset();
    fileWalker
        .on('error', function() {
            error = true;
        })
        .on('end', function() {
            assert.ok(error);
            start(test11);
        })
        .walk('./asdasd/');
}

///////////////////////////////////////////////////////////////////////////////////////

function test11() {
    var countedItems = 0;
    
    reset();
    fileWalker
        .on('file', function(path) {
            countedItems++;
        })
        .on('end', function() {
            assert.equal(countedItems, 8);
            start(test12);
        })
        .walk(path.resolve('./folder1'));
    fileWalker
        .walk(path.resolve('./folder1'));
}

///////////////////////////////////////////////////////////////////////////////////////

function test12() {
    var countedItems = 0;
    
    reset();
    fileWalker
        .on('file', function() {
            countedItems++;
        })
        .on('end', function() {
            assert.equal(countedItems, 2);
            start(test13);
        })
        .walk(path.resolve('./folder1'), 1);
}

///////////////////////////////////////////////////////////////////////////////////////

function test13() {
    var path1;
    var path2;
    
    reset();
    
    function finished(path) {
        path2 = path;
        assert.equal(path1, path2);
        start(test14);
    }

    fileWalker
        .once('fileRead', function(path) {
            path1 = path;
        })
        .walk(path.resolve('./folder1/file1.js'), FileWalker.RECURSIVE, 'utf8');
    fileWalker
        .once('idle', function() {
            fileWalker.readFile(path.resolve('./folder1/file1.js'), 'utf8', finished);
        })
        
}

///////////////////////////////////////////////////////////////////////////////////////

function test14() {  
    var times = 0;
    
    reset();
    
    function finished() {
        var path;
        
        times++;
        if(times === 2) {
            for(path in itemsFound) {
                assert.equal(itemsFound[path], 2);
            }
            start(test15);
            
        }
    }
    
    fileWalker
        .on('fileOrDir', function(path) {
            if(itemsFound.hasOwnProperty(path)) {
                itemsFound[path]++;
            } else {
                itemsFound[path] = 1;
            }
        })
        .on('end', finished)
        .walkSync(path.resolve('./folder1'));
    fileWalker
        .walk(path.resolve('./folder1'));
        
        
}

///////////////////////////////////////////////////////////////////////////////////////

function test15() {
    reset();
    
    function finished() {
        start(test16);
    }
    
    fileWalker
        .once('fileOrDir', function(path) {
            fileWalker.on('fileOrDir', function() {
                throw new Error('This event should not be fired');
            });
            fileWalker.on('idle', finished);
            fileWalker.stop();
        })
        .walkSync(path.resolve('./folder1'));
        
}

///////////////////////////////////////////////////////////////////////////////////////

function test16() {
    var times = 0;
    
    reset();
    
    function finished(path, collection) {
        var i;
        
        itemsFound[times] = {};
        
        for(i=0; i<collection.length; i++) {
            itemsFound[times][collection[i]] = true;
        }
        times++;
        if(times === 2) {
            assert.deepEqual(itemsFound[1], itemsFound[0]);
            start(test17);
        }
    }
    
    fileWalker
        .on('end', finished)
        .walkSync(path.resolve('./folder1'));
        
    fileWalker
        .walk(path.resolve('./folder1'));
}

///////////////////////////////////////////////////////////////////////////////////////

function test17() {
    var times = 0;
    
    reset();
    
    function finished(path, collection) {
        itemsFound[times] = collection;
        times++;
        if(times === 2) {
            assert.deepEqual(itemsFound[1], itemsFound[0]);
            console.log('All tests ok');
        }
    }
    
    fileWalker
        .on('end', finished)
        .walkSync(path.resolve('./folder1'), FileWalker.RECURSIVE, 'utf8');
        
    fileWalker
        .walk(path.resolve('./folder1'), FileWalker.RECURSIVE, 'utf8');
}

///////////////////////////////////////////////////////////////////////////////////////

console.log('There should be an "All tests ok" at the end ...');
test1();