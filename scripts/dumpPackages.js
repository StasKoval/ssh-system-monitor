/**
 * Created by mtford on 20/02/2014.
 */

var fs = require("fs");

/**
 * Dump contents of node_modules so can add to packages.json
 */
function main() {
    fs.readdir("../node_modules", function (err, dirs) {
        if (err) {
            console.log(err);
            return;
        }
        dirs.forEach(function(dir){
            if (dir.indexOf(".") !== 0) {
                var packageJsonFile = "../node_modules/" + dir + "/package.json";
                if (fs.existsSync(packageJsonFile)) {
                    fs.readFile(packageJsonFile, function (err, data) {
                        if (err) {
                            console.log(err);
                        }
                        else {
                            var json = JSON.parse(data);
                            console.log('"'+json.name+'": "' + json.version + '",');
                        }
                    });
                }
            }
        });

    });
}

main();