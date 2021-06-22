'use strict';var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}const countries = require('i18n-iso-countries');
const admin = require('firebase-admin');
const db = admin.firestore();


exports.getIndex = (() => {var _ref = (0, _asyncToGenerator3.default)(function* (req, res) {
    let data = { user: req.user, is_admin: req.is_admin };
    const reportedYear =
    2018;
    // ((new Date()).getFullYear() - 1).toString();
    data.reported_year = reportedYear;
    try {
      const querySnapshot = yield db.collection('reports').
      where('reported_year', '==', reportedYear)
      // .where('status', '==', 'finalizado')
      .get();
      // let batch = db.batch();
      // querySnapshot.docs.forEach(doc => {
      //   batch.delete(doc.ref);
      // });
      // await batch.commit();
      if (querySnapshot.empty) {
        console.log('No documents found.');
      } else {
        console.log('Documents found.');
        let reports = querySnapshot.docs.map(function (doc) {return doc.data();});
        // console.log("reports");
        // console.log(reports);
        topStatistics(reports, data);
        yield investmentByCountry(reports, data);
        yield investmentByInstitution(reports, data, res);
        data.investment_by_institution.sort(function (a, b) {
          if (a.amount > b.amount)
          return -1;
          return 1;
        });
        data.investment_by_institution = data.investment_by_institution.slice(0, 4);
        if (data.investment_by_institution.length > 0) {
          const maxAmount = data.investment_by_institution[0].amount;
          data.investment_by_institution.forEach(function (item) {
            item.progress = item.amount / maxAmount * 100;
            item.amount = item.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
          });
        }
      }
      // console.log(data);
      return res.render('index', data);
    } catch (error) {
      console.log('Error: ', error);
      data.error = 'Error al consultar la base de datos';
      return res.render('index', data);
    }
  });return function (_x, _x2) {return _ref.apply(this, arguments);};})();

const topStatistics = (reports, data) => {
  data.forms = reports.length;
  let totalBeneficiaries = 0;
  let totalFemale = 0;
  let totalMale = 0;
  let totalInvestment = 0;
  for (let i = 0; i < reports.length; i++) {
    // console.log("reports[i].programs");
    // console.log(reports[i].programs);
    if (reports[i].programs) {
      for (let j = 0; j < reports[i].programs.length; j++) {
        // console.log(reports[i].programs[j].beneficiaries)
        // if (reports[i].programs[j].beneficiaries){
        //   totalBeneficiaries += Number(reports[i].programs[j].beneficiaries);
        // }
        if (reports[i].programs[j].investment) {
          totalInvestment += Number(reports[i].programs[j].investment);
        }
      }
      console.log("reports[" + i + "].pregrado_female_students");
      console.log(reports[i].pregrado_female_students);
      if (reports[i].pregrado_female_students) {
        totalBeneficiaries += Number(reports[i].pregrado_female_students);
        totalFemale += Number(reports[i].pregrado_female_students);
      }
      console.log("reports[" + i + "].posgrado_female_students");
      console.log(reports[i].posgrado_female_students);
      if (reports[i].posgrado_female_students) {
        totalBeneficiaries += Number(reports[i].posgrado_female_students);
        totalFemale += Number(reports[i].posgrado_female_students);
      }
      if (reports[i].pregrado_male_students) {
        totalBeneficiaries += Number(reports[i].pregrado_male_students);
        totalMale += Number(reports[i].pregrado_male_students);
      }
      if (reports[i].posgrado_male_students) {
        totalBeneficiaries += Number(reports[i].posgrado_male_students);
        totalMale += Number(reports[i].posgrado_male_students);
      }
    }
  }
  data.total_beneficiaries = totalBeneficiaries;
  console.log("----------------data.total_beneficiaries---------------------");
  console.log(data.total_beneficiaries);
  console.log(totalFemale);
  if (totalBeneficiaries > 0) {
    data.percentage_female = (totalFemale / totalBeneficiaries * 100).toFixed(2);
    data.percentage_male = (totalMale / totalBeneficiaries * 100).toFixed(2);
    data.total_beneficiaries = data.total_beneficiaries.toLocaleString('en-US', { style: 'decimal' });
  }
  data.total_investment = totalInvestment.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

const getInstitutionCountry = (() => {var _ref2 = (0, _asyncToGenerator3.default)(function* (report) {
    const querySnapshot = yield db.collection('users').
    where('user_id', '==', report.user_id).
    get();
    return querySnapshot.docs[0].data().country;
  });return function getInstitutionCountry(_x3) {return _ref2.apply(this, arguments);};})();

const investmentByCountry = (() => {var _ref3 = (0, _asyncToGenerator3.default)(function* (reports, data) {
    let investments = [];
    for (let i = 0; i < reports.length; i++) {
      if (reports[i].programs) {
        const institutionCountry = yield getInstitutionCountry(reports[i]);
        // console.log("institutionCountry")
        // console.log(institutionCountry)
        let investment = investments.find(function (item) {return item.country_code === institutionCountry;});
        if (!investment) {
          investment = {
            country_code: institutionCountry,
            country_name: countries.getName(institutionCountry, 'es'),
            amount: 0 };

          investments.push(investment);
        }
        for (let j = 0; j < reports[i].programs.length; j++) {
          if (reports[i].programs[j].investment) {
            investment.amount += Number(reports[i].programs[j].investment);
          }
        }
      }
    }
    investments.sort(function (a, b) {
      if (a.amount > b.amount)
      return -1;
      return 1;
    });
    data.investment_by_country = investments.slice(0, 15);
    // console.log("data.investment_by_country")
    // console.log(data.investment_by_country)
  });return function investmentByCountry(_x4, _x5) {return _ref3.apply(this, arguments);};})();

const investmentByInstitution = (() => {var _ref4 = (0, _asyncToGenerator3.default)(function* (reports, data, res) {
    data.investment_by_institution = [];
    for (let i = 0; i < reports.length; i++) {
      if (reports[i].programs && reports[i].programs.length > 0) {
        let amount = 0;
        for (let j = 0; j < reports[i].programs.length; j++) {
          amount += Number(reports[i].programs[j].investment);
        }
        const querySnapshot = yield db.collection('users').
        where('user_id', '==', reports[i].user_id).
        get();
        const institutionName = querySnapshot.docs[0].data().name;
        const investment = {
          user_id: reports[i].user_id,
          institution_name: institutionName,
          amount: amount };

        data.investment_by_institution.push(investment);
      }
    }
  });return function investmentByInstitution(_x6, _x7, _x8) {return _ref4.apply(this, arguments);};})();