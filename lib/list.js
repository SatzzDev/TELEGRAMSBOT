const fs = require('fs');

function addResponList(key, name, response, isImage, image_buffer, _db) {
const obj_add = {
key: key,
name: name,
response: response,
isImage: isImage,
image_buffer: image_buffer
};
_db.push(obj_add);
fs.writeFileSync('./src/list.json', JSON.stringify(_db, null, 3));
}

function getDataResponList(key, _db) {
return _db.find(item => item.key === key) || null;
}

function isAlreadyResponList(key, _db) {
return _db.some(item => item.key === key);
}

function sendResponList(key, _db) {
const item = _db.find(item => item.key === key);
return item ? item.response : null;
}

function isAlreadyResponListGroup(groupID, _db) {
return _db.some(item => item.id === groupID);
}

function delResponList(key, _db) {
const index = _db.findIndex(item => item.key === key);
if (index !== -1) {
_db.splice(index, 1);
fs.writeFileSync('./src/list.json', JSON.stringify(_db, null, 3));
}
}

function updateResponList(key, response, isImage, image_url, _db) {
const item = _db.find(item => item.key === key);
if (item) {
item.response = response;
item.isImage = isImage;
item.image_url = image_url;
fs.writeFileSync('./src/list.json', JSON.stringify(_db, null, 3));
}
}

module.exports = {
addResponList,
delResponList,
isAlreadyResponList,
isAlreadyResponListGroup,
sendResponList,
updateResponList,
getDataResponList
};
