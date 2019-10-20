function downloadObjectAsJson(exportObj){
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(exportObj.replace(/&quot;/g, '\"'));
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "data" + ".json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}