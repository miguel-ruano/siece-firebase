const admin = require('firebase-admin');
const db = admin.firestore();
const Intl = require("intl")
const appSettings = require('../../utils/es7/appSettingsService')



let reportedYear = (new Date()).getFullYear() - 1;

const df = new Intl.DateTimeFormat('es', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

exports.getReports = async (req, res) => {
  let data = { user: req.user };
  try {
    let available_years = await appSettings.getAvailableYears();
    data.can_report = await appSettings.canReport();
    data.min_year = available_years[0]
    data.max_year = available_years[available_years.length - 1]
    const usersSnapshot = await db.collection('users')
      .where('user_id', '==', req.user.uid)
      .get();

    if (usersSnapshot.empty) {
      data.warning = 'Debe completar los datos de su perfil para porder crear reportes.';
    } else {
      const reportsSnapshot = await db.collection('reports')
        .where('user_id', '==', req.user.uid)
        .get();

      if (reportsSnapshot.empty) {
        console.log('No documents found.');
      }

      data.reported_year = reportedYear;

      data.reports =
        reportsSnapshot.docs.map((doc) => {
          let report = doc.data();
          report = {
            // institution_name: await getInstitutionName(report.user_id),
            user_id: report.user_id,
            reported_year: report.reported_year,
            status: report.status,
            created_at: report.created_at,
            updated_at: report.updated_at,
            editable: report.status === 'Incompleto'
          };
          return report;
        });
    }

    return res.render('select-form', data);
  } catch(error) {
    console.log('Error: ', error);
    data.error = 'Error al consultar la base de datos';
    return res.render('select-form', data);
  }
};

exports.createReport = async (req, res) => {
  let data = { user: req.user };
  let available_years = await appSettings.getAvailableYears();
  data.can_report = await appSettings.canReport();
  data.min_year = available_years[0]
  data.max_year = available_years[available_years.length - 1]
  const formData = req.body;
  const usersSnapshot = await db.collection('users')
    .where('user_id', '==', req.user.uid)
    .get();
  try {
    if (usersSnapshot.size === 1) {
      const reportsSnapshot = await db.collection('reports')
        .where('user_id', '==', req.user.uid)
        .where('reported_year', '==', Number(formData.reported_year))
        .get();
      if (reportsSnapshot.empty) {
        console.log('No documents found. Proceeding to create document');
        await db.collection('reports').doc().set({
          user_id: req.user.uid,
          reported_year: Number(formData.reported_year),
          status: 'Incompleto',
          created_at: df.format(new Date()),
          updated_at: df.format(new Date())
        });
        data.success = 'Reporte creado correctamente';
      } else {
        console.log('Error: ', 'Report already exists');
        data.error = 'El reporte ya existe';
      }
    } else {
      console.log('Error: ', 'User must have a user profile');
      data.error = 'Debe completar los datos del perfil para crear reportes';
    }

    var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };


    const reportsSnapshot = await db.collection('reports')
      .where('user_id', '==', req.user.uid)
      .get();
    if (reportsSnapshot.empty) {
      console.log('No documents found.');
    } else {
      data.reports = reportsSnapshot.docs.map(doc => {
        let report = doc.data();
        report = {
          // institution_name: await getInstitutionName(report.user_id),
          user_id: report.user_id,
          reported_year: report.reported_year,
          status: report.status,
          created_at: report.created_at,
          updated_at:report.updated_at,
          editable: report.status === 'Incompleto'
        };
        return report;
      });
    }
    return res.render('select-form', data);
  } catch(error) {
    console.log('Error: ', error);
    if (!data.error)
      data.error = 'Error al consultar la base de datos';
    return res.render('select-form', data);
  }
};

exports.getReport = async (req, res) => {
  let data = { user: req.user };
  let available_years = await appSettings.getAvailableYears();
  data.can_report = await appSettings.canReport();
  data.min_year = available_years[0]
  data.max_year = available_years[available_years.length - 1]
  data.can_report = await appSettings.canReport();
  const reportsSnapshot = await db.collection('reports')
    .where('user_id', '==', req.user.uid)
    .where('reported_year', '==', Number(req.params.reported_year))
    .get();
  try {
    if (reportsSnapshot.size === 1) {
      data.report = reportsSnapshot.docs[0].data();
      if (data.report.status !== 'Incompleto') {
        data.error = 'El reporte ya fué enviado para revisión o ya está completo.';
        data.report = null;
      }
    } else {
      console.log('Duplicate or non-existent report');
      data.error = 'No se han podido recuperar los datos de la institución. Contacte al administrador.';
    }
    return res.render('form', data);
  } catch(error) {
    console.log('Error: ', error);
    data.error = 'No se han podido recuperar los datos de la institución. Contacte al administrador.';
    return res.render('form', data);
  }
};

exports.processReport = async (req, res) => {
  // console.log(req.body);
  let data = { user: req.user };
  let available_years = await appSettings.getAvailableYears();
  data.can_report = await appSettings.canReport();
  data.min_year = available_years[0];
  data.max_year = available_years[available_years.length - 1];
  const formData = req.body;
  const reportsSnapshot = await db.collection('reports')
    .where('user_id', '==', req.user.uid)
    .where('reported_year', '==', Number(req.params.reported_year))
    .get();
  try {
    if (reportsSnapshot.size === 1) {
      if (reportsSnapshot.docs[0].data().status === 'Incompleto') {
        let report = {};

        let sources = [];
        let obj;
        if (formData.sources && formData.source_amounts) {
          if (typeof formData.sources === typeof []) {
            for (let i = 0; i < formData.sources.length; i++) {
              obj = {};
              obj.source = formData.sources[i];
              obj.amount = formData.source_amounts[i];
              if (obj.source === 'otra')
                obj.name = formData.source_otra_name;
              sources.push(obj);
            }
          } else {
            obj = {};
            obj.source = formData.sources;
            obj.amount = Number(formData.source_amounts);
            if (obj.source === 'otra')
              obj.name = formData.source_otra_name;
            sources.push(obj);
          }
        }
        report.funding_sources = sources;

        if (formData.regulated){
          report.regulated = formData.regulated;
        }
        if (formData.regulating_entity){
          report.regulating_entity = formData.regulating_entity;
        }
        if (formData.credit_rating){
          report.credit_rating = formData.credit_rating;
        }
        
        if (formData.rating_agency){
          report.rating_agency = formData.rating_agency;
        }

        

        if (formData.total_investment) {
          report.total_investment = Number(formData.total_investment);
        }

        if (formData.total_students) {
          report.total_students = Number(formData.total_students);
        }

        if (formData.total_students_year_since) {
          report.total_students_year_since = Number(formData.total_students_year_since);
        }

        let current_portfolio = [];
        if (formData.current_portfolio && formData.current_portfolio_amounts) {
          if (typeof formData.current_portfolio === typeof []) {
            for (let i = 0; i < formData.current_portfolio.length; i++) {
              obj = {};
              obj.name = formData.current_portfolio[i];
              obj.amount = Number(formData.current_portfolio_amounts[i]);
              current_portfolio.push(obj);
            }
          } else {
            obj = {};
            obj.name = formData.current_portfolio;
            obj.amount = Number(formData.current_portfolio_amounts);
            current_portfolio.push(obj);
          }
        }
        report.current_portfolio = current_portfolio;

        if (formData.current_portfolio_pregrado_male) {
          report.current_portfolio_pregrado_male = Number(formData.current_portfolio_pregrado_male);
        }

        if (formData.current_portfolio_pregrado_female) {
          report.current_portfolio_pregrado_female = Number(formData.current_portfolio_pregrado_female);
        }

        if (formData.current_portfolio_posgrado_male) {
          report.current_portfolio_posgrado_male = Number(formData.current_portfolio_posgrado_male);
        }

        if (formData.current_portfolio_posgrado_female) {
          report.current_portfolio_posgrado_female = Number(formData.current_portfolio_posgrado_female);
        }

        let pastdue_portfolio = [];
        if (formData.pastdue_portfolio && formData.pastdue_portfolio_amounts) {
          if (typeof formData.pastdue_portfolio === typeof []) {
            for (let i = 0; i < formData.pastdue_portfolio.length; i++) {
              obj = {};
              obj.name = formData.pastdue_portfolio[i];
              obj.amount = Number(formData.pastdue_portfolio_amounts[i]);
              pastdue_portfolio.push(obj);
            }
          } else {
            obj = {};
            obj.name = formData.pastdue_portfolio;
            obj.amount = Number(formData.pastdue_portfolio_amounts);
            pastdue_portfolio.push(obj);
          }
        }
        report.pastdue_portfolio = pastdue_portfolio;

        if (formData.pastdue_portfolio_pregrado_male) {
          report.pastdue_portfolio_pregrado_male = Number(formData.pastdue_portfolio_pregrado_male);
        }

        if (formData.pastdue_portfolio_pregrado_female) {
          report.pastdue_portfolio_pregrado_female = Number(formData.pastdue_portfolio_pregrado_female);
        }

        if (formData.pastdue_portfolio_posgrado_male) {
          report.pastdue_portfolio_posgrado_male = Number(formData.pastdue_portfolio_posgrado_male);
        }

        if (formData.pastdue_portfolio_posgrado_female) {
          report.pastdue_portfolio_posgrado_female = Number(formData.pastdue_portfolio_posgrado_female);
        }

        let execution_portfolio = [];
        if (formData.execution_portfolio && formData.execution_portfolio_amounts) {
          if (typeof formData.execution_portfolio === typeof []) {
            for (let i = 0; i < formData.execution_portfolio.length; i++) {
              obj = {};
              obj.name = formData.execution_portfolio[i];
              obj.amount = Number(formData.execution_portfolio_amounts[i]);
              execution_portfolio.push(obj);
            }
          } else {
            obj = {};
            obj.name = formData.execution_portfolio;
            obj.amount = Number(formData.execution_portfolio_amounts);
            execution_portfolio.push(obj);
          }
        }
        report.execution_portfolio = execution_portfolio;

        if (formData.execution_portfolio_pregrado_male) {
          report.execution_portfolio_pregrado_male = Number(formData.execution_portfolio_pregrado_male);
        }

        if (formData.execution_portfolio_pregrado_female) {
          report.execution_portfolio_pregrado_female = Number(formData.execution_portfolio_pregrado_female);
        }

        if (formData.execution_portfolio_posgrado_male) {
          report.execution_portfolio_posgrado_male = Number(formData.execution_portfolio_posgrado_male);
        }

        if (formData.execution_portfolio_posgrado_female) {
          report.execution_portfolio_posgrado_female = Number(formData.execution_portfolio_posgrado_female);
        }

        let risks = [];
        if (formData.risks) {
          if (typeof formData.risks === typeof []) {
            risks = formData.risks;
          } else {
            risks.push(formData.risks);
          }
          formData.risks_other ? report.risks_other = formData.risks_other : report.risks_other = '';
        }
        report.risks = risks;

        if (formData.risk_increasing_actions) {
          report.risk_increasing_actions = formData.risk_increasing_actions;
        }

        if (formData.risk_mitigating_actions) {
          report.risk_mitigating_actions = formData.risk_mitigating_actions;
        }

        if (formData.non_payment_risk) {
          let non_payment_risk = {};
          non_payment_risk.risk = formData.non_payment_risk;
          if (formData.non_payment_risk_si)
            non_payment_risk.name = formData.non_payment_risk_si;
          if (formData.non_payment_risk_si_other)
            non_payment_risk.other = formData.non_payment_risk_si_other;
          report.non_payment_risk = non_payment_risk;
        }

        if (formData.pregrado_male_students) {
          report.pregrado_male_students = Number(formData.pregrado_male_students);
        }

        if (formData.pregrado_female_students) {
          report.pregrado_female_students = Number(formData.pregrado_female_students);
        }

        if (formData.posgrado_male_students) {
          report.posgrado_male_students = Number(formData.posgrado_male_students);
        }

        if (formData.posgrado_female_students) {
          report.posgrado_female_students = Number(formData.posgrado_female_students);
        }

        if (formData.pregrado_high_students) {
          report.pregrado_high_students = Number(formData.pregrado_high_students);
        }

        if (formData.pregrado_medium_students) {
          report.pregrado_medium_students = Number(formData.pregrado_medium_students);
        }

        if (formData.pregrado_low_students) {
          report.pregrado_low_students = Number(formData.pregrado_low_students);
        }

        if (formData.posgrado_high_students) {
          report.posgrado_high_students = Number(formData.posgrado_high_students);
        }

        if (formData.posgrado_medium_students) {
          report.posgrado_medium_students = Number(formData.posgrado_medium_students);
        }

        if (formData.posgrado_low_students) {
          report.posgrado_low_students = Number(formData.posgrado_low_students);
        }

        if (formData.pregrado_graduate_percentage) {
          report.pregrado_graduate_percentage = Number(formData.pregrado_graduate_percentage);
        }

        if (formData.posgrado_graduate_percentage) {
          report.posgrado_graduate_percentage = Number(formData.posgrado_graduate_percentage);
        }

        if (formData.pregrado_benefits) {
          let benefits = {};
          benefits.option = formData.pregrado_benefits;
          if (formData.pregrado_benefits_cuales)
            benefits.names = formData.pregrado_benefits_cuales;
          report.pregrado_benefits = benefits;
        }

        if (formData.posgrado_benefits) {
          let benefits = {};
          benefits.option = formData.posgrado_benefits;
          if (formData.posgrado_benefits_cuales)
            benefits.names = formData.posgrado_benefits_cuales;
          report.posgrado_benefits = benefits;
        }

        // programs
        let programs = [];
        let beneficiaries_pregrado = 0;
        let beneficiaries_posgrado = 0;
        for (let i = 1; i <= formData.program_quantity; i++) {
          obj = {};
          if (formData['program' + i + '_level'])
            obj.level = formData['program' + i + '_level'];

          if (formData['program' + i + '_name'])
            obj.name = formData['program' + i + '_name'];

          if (formData['program' + i + '_beneficiaries']){
            obj.beneficiaries = Number(formData['program' + i + '_beneficiaries']);
            if (obj.level=='pregrado'){
              beneficiaries_pregrado+= obj.beneficiaries;
            }else if(obj.level=='posgrado'){
              beneficiaries_posgrado+= obj.beneficiaries;
            }
          }

          if (formData['program' + i + '_term'])
            obj.term = formData['program' + i + '_term'];

          if (formData['program' + i + '_investment'])
            obj.investment = Number(formData['program' + i + '_investment']);

          if (formData['program' + i + '_rate']) {
            let rate = {};
            rate.type = formData['program' + i + '_rate'];
            rate.percentage = Number(formData['program' + i + '_rate_percentage']);
            obj.rate = rate;
          }

          if (formData['program' + i + '_repayment']) {
            let repayment = {};
            repayment.type = formData['program' + i + '_repayment'];
            if (repayment.type === 'otra')
              repayment.other = formData['program' + i + '_repayment_other'];
            obj.repayment = repayment;
          }

          if (formData['program' + i + '_grace'])
            obj.grace = formData['program' + i + '_grace'];

          if (formData['program' + i + '_warranties']) {
            if (typeof formData['program' + i + '_warranties'] === typeof [])
              obj.warranties = formData['program' + i + '_warranties'];
            else
              obj.warranties = [formData['program' + i + '_warranties']];
          }

          if (formData['program' + i + '_warranties_other'])
            obj.warranties_other = formData['program' + i + '_warranties_other'];

          if (formData['program' + i + '_guarantors']) {
            if (typeof formData['program' + i + '_guarantors'] === typeof [])
              obj.guarantors = formData['program' + i + '_guarantors'];
            else
              obj.guarantors = [formData['program' + i + '_guarantors']];
          }

          if (formData['program' + i + '_guarantors_other'])
            obj.guarantors_other = formData['program' + i + '_guarantors_other'];

          let credit_pais = {};
          if (formData['program' + i + '_credit_pais_new'])
            credit_pais.new = Number(formData['program' + i + '_credit_pais_new']);
          if (formData['program' + i + '_credit_pais_old'])
            credit_pais.old = Number(formData['program' + i + '_credit_pais_old']);
          obj.credit_pais = credit_pais;

          let credit_exterior = {};
          if (formData['program' + i + '_credit_exterior_new'])
            credit_exterior.new = Number(formData['program' + i + '_credit_exterior_new']);
          if (formData['program' + i + '_credit_exterior_old'])
            credit_exterior.old = Number(formData['program' + i + '_credit_exterior_old']);
          obj.credit_exterior = credit_exterior;

          programs.push(obj);
        }
        report.pregrado_students = beneficiaries_pregrado;
        report.posgrado_students = beneficiaries_posgrado;
        report.pregrado_students_economic = beneficiaries_pregrado;
        report.posgrado_students_economic = beneficiaries_posgrado;

        report.programs = programs;

        report.updated_at = (new Date()).toUTCString();

        if (formData.complete)
          report.status = 'Enviado';
        else
          report.status = 'Incompleto';

        data.report = report;
        const result = await reportsSnapshot.docs[0].ref.set(report, {merge: true});
        console.log('Data saved: ', result);
        data.success = 'Datos guardados exitosamente';
      } else {
        data.error = 'El reporte ya fué enviado para revisión o ya está completo.';
      }
    } else {
      console.log('Duplicate or non-existent report.');
      data.error = 'No se han podido recuperar los datos de la institución. Contacte al administrador.';
    }
    if (formData.complete)
      return res.redirect('/formularios');
    else
      return res.render('form', data);
  } catch(error) {
    console.log('Error: ', error);
    if (!data.error)
      data.error = 'Error al consultar la base de datos';
    data.report = formData;
    return res.render('form', data);
  }
};
