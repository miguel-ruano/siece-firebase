const countries = require('i18n-iso-countries');
const admin = require('firebase-admin');
const db = admin.firestore();
const appSettings = require('../../utils/es7/appSettingsService');



exports.getIndex = async (req, res) => {
  let data = { user: req.user, is_admin: req.is_admin };
  const reportedYear = req.query.year && !isNaN(parseInt(req.query.year)) ? parseInt(req.query.year) : new Date().getFullYear();
  data.reported_year = `${reportedYear}`;
  data.can_visualize = await appSettings.canVisualize();
  data.available_years = await appSettings.getAvailableYears();
  try {
    const querySnapshot = await db.collection('reports')
      .where('reported_year', '==', reportedYear)
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
      let reports = querySnapshot.docs.map(doc => doc.data());
      // console.log("reports");
      // console.log(reports);
      topStatistics(reports, data);
      await investmentByCountry(reports, data);
      await investmentByInstitution(reports, data, res);
      data.investment_by_institution.sort((a, b) => {
        if (a.amount > b.amount)
          return -1;
        return 1;
      });
      data.investment_by_institution = data.investment_by_institution.slice(0, 4);
      if (data.investment_by_institution.length > 0) {
        const maxAmount = data.investment_by_institution[0].amount;
        data.investment_by_institution.forEach((item) => {
          item.progress = item.amount / maxAmount * 100;
          item.amount = item.amount.toLocaleString('en-US', {style: 'currency', currency: 'USD'});
        });
      }
    }
    // console.log(data);
    return res.render('index', data);
  } catch(error) {
    console.log('Error: ', error);
    data.error = 'Error al consultar la base de datos';
    return res.render('index', data);
  }
};

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
        if (reports[i].programs[j].beneficiaries){
          totalBeneficiaries += Number(reports[i].programs[j].beneficiaries);
        }
        if (reports[i].programs[j].investment){
          totalInvestment += Number(reports[i].programs[j].investment);
        }
      }
    }
  }
  data.total_beneficiaries = totalBeneficiaries;
  if (totalBeneficiaries > 0) {
    data.percentage_female = (totalFemale / totalBeneficiaries * 100).toFixed(2);
    data.percentage_male = (totalMale / totalBeneficiaries * 100).toFixed(2);
    data.total_beneficiaries = data.total_beneficiaries.toLocaleString('en-US', { style: 'decimal' });
    data.investment_student = (totalInvestment / totalBeneficiaries).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }
  data.total_investment = totalInvestment.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

const getInstitutionCountry = async (report) => {
  const querySnapshot = await db.collection('users')
    .where('user_id', '==', report.user_id)
    .get();
  return querySnapshot.docs[0].data().country;
};

const investmentByCountry = async (reports, data) => {
  let investments = [];
  for (let i = 0; i < reports.length; i++) {
    if (reports[i].programs) {
      const institutionCountry = await getInstitutionCountry(reports[i]);
      // console.log("institutionCountry")
      // console.log(institutionCountry)
      let investment = investments.find((item) => item.country_code === institutionCountry);
      if (!investment) {
        investment = {
          country_code: institutionCountry,
          country_name: countries.getName(institutionCountry, 'es'),
          amount: 0
        };
        investments.push(investment);
      }
      for (let j = 0; j < reports[i].programs.length; j++) {
        if (reports[i].programs[j].investment){
          investment.amount += Number(reports[i].programs[j].investment);
        }
      }
    }
  }
  investments.sort((a, b) => {
    if (a.amount > b.amount)
      return -1;
    return 1;
  });
  data.investment_by_country = investments.slice(0, 15);
  // console.log("data.investment_by_country")
  // console.log(data.investment_by_country)
};

const investmentByInstitution = async (reports, data, res) => {
  data.investment_by_institution = [];
  for (let i = 0; i < reports.length; i++) {
    if (reports[i].programs && reports[i].programs.length > 0) {
      let amount = 0;
      for (let j = 0; j < reports[i].programs.length; j++) {
        amount += Number(reports[i].programs[j].investment);
      }
      const querySnapshot = await db.collection('users')
        .where('user_id', '==', reports[i].user_id)
        .get();
      const institutionName = querySnapshot.docs[0].data().name;
      const investment = {
        user_id: reports[i].user_id,
        institution_name: institutionName,
        amount: amount
      };
      data.investment_by_institution.push(investment);
    }
  }
};
