const admin = require('firebase-admin');
var fs = require('fs');

const auth = admin.auth();
const db = admin.firestore();


exports.saveJsonInFile = async (filename, jsonData) => {
    fs.writeFile(filename, jsonData, function (err) {
        if (err) {
            console.log(err);
        }
    });
}

exports.readJsonInFile = (filename) => {
    let jsonData = fs.readFileSync(filename, 'utf8');
    jsonData = JSON.parse(jsonData);
    jsonData = jsonData['data'] ? jsonData['data'] : jsonData;
    return jsonData;
}

exports.saveAllUsers = async () => {
    auth.listUsers().then(function (listUsersResult) {
        let jsonUsers = [];
        listUsersResult.users.forEach(function (userRecord) {
            jsonUsers.push(userRecord.toJSON());
        });
        return jsonUsers;
    }).then(jsonUsers => {
        console.log(jsonUsers);
        this.saveJsonInFile("./migration/users-auth.json", JSON.stringify(jsonUsers));
        return true;
    }).catch(function (error) {
        console.log("Error listing users:", error);
    });
}

exports.importUsers = async (file) => {
    let jsonUsers = this.readJsonInFile(file);
    console.log('usuarios a importar', jsonUsers.length);
    jsonUsers.forEach(async (user, index) => {
        try {
            console.log('importando usuario ', index + 1, 'de', jsonUsers.length);
            const userExist = await new Promise((resolve, reject) => {  auth.getUser(user['uid']).then(data => resolve(data)).catch(err => {console.log(err);  return resolve(null)  }); });  
            if (!userExist) {
                await auth.createUser({
                    uid: user['uid'],
                    disabled: user['disabled'],
                    displayName: user['displayName'],
                    email: user['email'],
                    emailVerified: true,
                    password: user['passwordSalt'].replace(/=/g, ''),
                });
                console.log('usuario creado correctamente');
            } else
                console.log('el usuario ya existe correctamente');

        } catch (error) {
            console.log('error importando usuario ', index + 1, 'id', user.uid, 'error', error);
        }
    });
}

exports.exportCollection = async (collection, file) => {
    const data = await db.collection(collection).get();
    console.log('exportando datos de la coleccion', collection, 'a', file);
    if (!data.empty) {
        this.saveJsonInFile(file, JSON.stringify(data.docs.map(doc => {
            let data = doc.data();
            data['id'] = doc.id;
            return data;
        })));
    } else {
        console.log('coleccion', collection, 'esta vacia'); s
    }
}

exports.exportAllCollections = async () => {
    const collections = await db.listCollections();
    collections.forEach(async collection => {
        await this.exportCollection(collection.id, './migration/' + collection.id + '.json');
    });
}

exports.importCollection = async (collection, file) => {
    let jsonData = this.readJsonInFile(file);
    console.log('importando datos de la coleccion', collection, 'de', file);
    jsonData.forEach(async (data, index) => {
        try {
            console.log('importando dato', index + 1, 'de', jsonData.length);
            await db.collection(collection).doc(data['id']).set(data);
            console.log(collection, 'dato importado correctamente', index + 1, 'de', jsonData.length);

        } catch (error) {
            console.log('error importando dato', index + 1, 'id', data.id, 'error', error);
        }
    });
}

exports.importAllCollections = async () => {
    const collections = await db.listCollections();
    collections.forEach(async collection => {
        await this.importCollection(collection.id, './migration/' + collection.id + '.json');
    });
}