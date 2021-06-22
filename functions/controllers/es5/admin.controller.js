'use strict';var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}const admin = require('firebase-admin');
const db = admin.firestore();
const firestoreService = require('firestore-export-import');



exports.getReports = (() => {var _ref = (0, _asyncToGenerator3.default)(function* (req, res) {
    let data = { user: req.user, is_admin: req.is_admin };
    if (req.data)
    data = req.data;
    const formData = req.body;

    let reportedYear = new Date().getFullYear() - 1;
    if (formData.reported_year)
    reportedYear = Number(formData.reported_year);
    data.reported_year = reportedYear;

    try {
      const reportsSnapshot = yield db.collection('reports').
      where('reported_year', '==', reportedYear)
      // .where('status', '==', 'finalizado')
      .get();

      data.reports = yield Promise.all(
      reportsSnapshot.docs.map((() => {var _ref2 = (0, _asyncToGenerator3.default)(
        function* (doc) {
          let report = doc.data();
          report = {
            institution_name: yield getInstitutionName(report.user_id),
            user_id: report.user_id,
            reported_year: report.reported_year,
            status: report.status,
            created_at: report.created_at,
            updated_at: report.updated_at,
            reviewable: report.status !== 'Incompleto' };

          return report;
        });return function (_x3) {return _ref2.apply(this, arguments);};})()));



      jsonObj = yield firestoreService.
      backup("reports").
      then((() => {var _ref3 = (0, _asyncToGenerator3.default)(function* (collections) {
          values = [];
          for (var i = 0; i < Object.keys(collections.reports).length; i++) {
            values.push(collections.reports[Object.keys(collections.reports)[i]]);
          }
          for (var j = 0; j < values.length; j++) {
            var u_id = values[j]["user_id"];
            values[j]["institution_name"] = yield getInstitutionName(u_id);
          }
          return values;
        });return function (_x4) {return _ref3.apply(this, arguments);};})());
      userJsonObj = yield firestoreService.
      backup("users").
      then((() => {var _ref4 = (0, _asyncToGenerator3.default)(function* (collections) {
          values = [];
          for (var i = 0; i < Object.keys(collections.users).length; i++) {
            values.push(collections.users[Object.keys(collections.users)[i]]);
          }
          return values;
        });return function (_x5) {return _ref4.apply(this, arguments);};})());

      console.log("jsonObj");
      console.log(jsonObj);

      console.log("userJsonObj");
      console.log(userJsonObj);
      data.firestoredb = JSON.stringify(jsonObj, null, 4).replace(/(\r\n|\n|\r)/gm, "");
      data.usersdb = JSON.stringify(userJsonObj, null, 4).replace(/(\r\n|\n|\r)/gm, "");

      console.log("data.firestoredb");
      console.log(data.firestoredb);
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
  });return function (_x, _x2) {return _ref.apply(this, arguments);};})();

exports.reviewReport = (() => {var _ref5 = (0, _asyncToGenerator3.default)(function* (req, res) {
    let data = { user: req.user, is_admin: req.is_admin };
    const params = req.query;
    const reportsSnapshot = yield db.collection('reports').get();

    try {
      if (params.reported_year && params.user) {
        const reportsSnapshot = yield db.collection('reports').
        where('user_id', '==', params.user).
        where('reported_year', '==', Number(params.reported_year)).
        get();
        if (reportsSnapshot.size === 1) {
          data.report = reportsSnapshot.docs[0].data();
          if (data.report.status === 'Incompleto') {
            data.error = 'Reporte incompleto no enviado para revisión aún.';
          } else {
            const usersSnapshot = yield db.collection('users').
            where('user_id', '==', params.user).
            get();
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
  });return function (_x6, _x7) {return _ref5.apply(this, arguments);};})();

exports.acceptOrDeclineReport = (() => {var _ref6 = (0, _asyncToGenerator3.default)(function* (req, res) {
    let data = { user: req.user, is_admin: req.is_admin };
    const params = req.query;
    const formData = req.body;

    try {
      if (params.reported_year && params.user) {
        const reportsSnapshot = yield db.collection('reports').
        where('user_id', '==', params.user).
        where('reported_year', '==', Number(params.reported_year)).
        get();
        if (reportsSnapshot.size === 1) {
          let report = reportsSnapshot.docs[0].data();
          if (Number(formData.accepted) === 1) {
            console.log('accepted: ', formData.accepted);
            if (report.status !== 'Incompleto') {
              report.status = 'Aceptado';
              const result = yield reportsSnapshot.docs[0].ref.set(report, { merge: true });
              console.log('Report accepted: ', result);
              data.success = 'Reporte aceptado exitosamente.';
            } else {
              data.error = 'Reporte ya aceptado o no enviado para revisión aún.';
            }
          } else {
            console.log('accepted: ', formData.accepted);
            if (report.status !== 'Incompleto') {
              report.status = 'Incompleto';
              const result = yield reportsSnapshot.docs[0].ref.set(report, { merge: true });
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
  });return function (_x8, _x9) {return _ref6.apply(this, arguments);};})();

const getInstitutionName = (() => {var _ref7 = (0, _asyncToGenerator3.default)(function* (userId) {
    const querySnapshot = yield db.collection('users').
    where('user_id', '==', userId).
    get();
    return querySnapshot.docs[0].data().name;
  });return function getInstitutionName(_x10) {return _ref7.apply(this, arguments);};})();

const dump = (() => {var _ref8 = (0, _asyncToGenerator3.default)(function* () {

  });return function dump() {return _ref8.apply(this, arguments);};})();

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