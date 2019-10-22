function jsonToCsv(array){
    var str = '';
    values = [];
    for (var i = 0; i< Object.keys(array.reports).length; i++){
        values.push(array.reports[Object.keys(array.reports)[i]])
    }


    for (var i = 0; i < values.length; i++) {
        var line = '';
        for (var index = 0 ; index< Object.keys(values[i]).length; index++){ 
            if (line != '') line += '\\-\\'

            line += values[i][Object.keys(values[i]).sort()[index]];
        }

        str += line + '\r\n';
    }

    return str;
}

function downloadObjectAsJson(exportObj){
    var jsonStr = exportObj.replace(/&quot;/g, '\"').replace(/(\r\n|\n|\r)/gm, "").replace(/(\t)/gm, " ");
    // console.log(jsonStr);
    // var jsonObj = JSON.parse(jsonStr);
    // console.log(jsonObj);
    var dataStr = "data:text/json;charset=utf-8," +encodeURI(jsonStr);
    // console.log(dataStr);
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "data" + ".json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

