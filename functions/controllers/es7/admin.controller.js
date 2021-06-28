const admin = require('firebase-admin');
const db = admin.firestore();



exports.getReports = async (req, res) => {
  const firestoreService = require('firestore-export-import');
  let data = { user: req.user, is_admin: req.is_admin };
  if (req.data)
    data = req.data;
  const formData = req.body;

  let reportedYear = (new Date()).getFullYear() - 1;
  if (formData.reported_year)
    reportedYear = Number(formData.reported_year);
  data.reported_year = reportedYear;
  data.current_year = new Date().getUTCFullYear();

  try {
    const reportsSnapshot = await db.collection('reports')
      .where('reported_year', '==', reportedYear)
      // .where('status', '==', 'finalizado')
      .get();

    data.reports = await Promise.all(
      reportsSnapshot.docs.map(
        async (doc) => {
          let report = doc.data();
          report = {
            institution_name: await getInstitutionName(report.user_id),
            user_id: report.user_id,
            reported_year: report.reported_year,
            status: report.status,
            created_at: report.created_at,
            updated_at: report.updated_at,
            reviewable: report.status !== 'Incompleto'
          };
          return report;
        }));
    

    
    jsonObj= await firestoreService
    .backup("reports")
    .then(async (collections) => {
      values = [];
      for (var i = 0; i< Object.keys(collections.reports).length; i++){
          values.push(collections.reports[Object.keys(collections.reports)[i]]);
      }
      for (var j=0;j<values.length; j++){
        var u_id = values[j]["user_id"];
        values[j]["institution_name"] = await getInstitutionName(u_id);
      }
      return values;
    })
    userJsonObj= await firestoreService
    .backup("users")
    .then(async (collections) => {
      values = [];
      for (var i = 0; i< Object.keys(collections.users).length; i++){
          values.push(collections.users[Object.keys(collections.users)[i]]);
      }
      return values;
    })
    
    // console.log("jsonObj");
    // console.log(jsonObj);
    
    // console.log("userJsonObj");
    // console.log(userJsonObj);
    data.firestoredb = JSON.stringify(jsonObj, null, 4).replace(/(\r\n|\n|\r)/gm,"");
    data.usersdb = JSON.stringify(userJsonObj, null, 4).replace(/(\r\n|\n|\r)/gm,"");

    // console.log("data.firestoredb");
    // console.log(data.firestoredb);
    // console.log('Reportes: ', data.reports);
    // generateJSONdb().then(function(jsondb){
    //   console.log("JSONDB ------ ");
    //   console.log(jsondb);
    //   data.firestoredb = jsondb;
    // });
    // console.log("data.firestoredb");
    // console.log(data.firestoredb);

    return res.render('admin', data);
  } catch (error) {
    console.log('Error: ', error);
    data.error = 'Error al consultar la base de datos.';
    return res.render('admin', data);
  }
};

exports.reviewReport = async (req, res) => {
  let data = { user: req.user, is_admin: req.is_admin };
  const params = req.query;
  const reportsSnapshot = await db.collection('reports').get()

  try {
    if (params.reported_year && params.user) {
      const reportsSnapshot = await db.collection('reports')
        .where('user_id', '==', params.user)
        .where('reported_year', '==', Number(params.reported_year))
        .get();
      if (reportsSnapshot.size === 1) {
        data.report = reportsSnapshot.docs[0].data();
        if (data.report.status === 'Incompleto') {
          data.error = 'Reporte incompleto no enviado para revisión aún.';
        } else {
          const usersSnapshot = await db.collection('users')
            .where('user_id', '==', params.user)
            .get();
          data.report.institution_name = usersSnapshot.docs[0].data().name;
        }
      } else {
        data.error = 'Reporte duplicado o inexistente.';
      }
    } else {
      data.error = 'Parametros incorrectos.';
    }

    return res.render('review-report', data);
  } catch (error) {
    console.log('Error: ', error);
    if (!data.error)
      data.error = 'Error al consultar la base de datos.';
    return res.render('review-report', data);
  }
};

exports.acceptOrDeclineReport = async (req, res) => {
  let data = { user: req.user, is_admin: req.is_admin };
  const params = req.query;
  const formData = req.body;

  try {
    if (params.reported_year && params.user) {
      const reportsSnapshot = await db.collection('reports')
        .where('user_id', '==', params.user)
        .where('reported_year', '==', Number(params.reported_year))
        .get();
      if (reportsSnapshot.size === 1) {
        let report = reportsSnapshot.docs[0].data();
        if (Number(formData.accepted) === 1) {
          console.log('accepted: ', formData.accepted);
          if (report.status !== 'Incompleto') {
            report.status = 'Aceptado';
            const result = await reportsSnapshot.docs[0].ref.set(report, {merge: true});
            console.log('Report accepted: ', result);
            data.success = 'Reporte aceptado exitosamente.';
          } else {
            data.error = 'Reporte ya aceptado o no enviado para revisión aún.';
          }
        } else {
          console.log('accepted: ', formData.accepted);
          if (report.status !== 'Incompleto') {
            report.status = 'Incompleto';
            const result = await reportsSnapshot.docs[0].ref.set(report, {merge: true});
            console.log('Report rejected: ', result);
            data.success = 'Reporte rechazado exitosamente.';
          } else {
            data.error = 'Reporte ya aceptado o no enviado para revisión aún.';
          }
        }
        return res.redirect('/admin');
      } else {
        data.error = 'Reporte duplicado o inexistente.';
      }
    } else {
      data.error = 'Parametros incorrectos.';
    }

    return res.render('review-report', data);
  } catch (error) {
    console.log('Error: ', error);
    if (!data.error)
      data.error = 'Error al consultar la base de datos.';
    return res.render('review-report', data);
  }
};

const getInstitutionName = async (userId) => {
  const querySnapshot = await db.collection('users')
    .where('user_id', '==', userId)
    .get();
  return querySnapshot.docs[0].data().name;
};

const dump = async ()=> {
  
}

// const dump = async (dbRef, aux, curr)=> {
//   const snapshot = await db.collection('users').get();
//   return Promise.all(Object.keys(aux).map((collection) => {
    
//     return db.collection(collection).get()
//       .then((data) => {
//         console.log("ENTROOOOOOO");
//         let promises = [];
//         data.forEach((doc) => {
//           const data = doc.data();
//           if(!curr[collection]) {
//             curr[collection] =  { 
//               data: { },
//               type: 'collection',
//             };
//             curr[collection].data[doc.id] = {
//               data,
//               type: 'document',
//             }
//           } else {
//             curr[collection].data[doc.id] = data;
//           }
//           promises.push(dump(dbRef.collection(collection).doc(doc.id), aux[collection], curr[collection].data[doc.id]));
//       })
//       return Promise.all(promises);
//     });
//   })).then(() => {
//     return curr;
//   })
// };

  
