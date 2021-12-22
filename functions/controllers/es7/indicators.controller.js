const admin = require('firebase-admin');
const db = admin.firestore();
const underscore = require('underscore');
const appSettings = require('../../utils/es7/appSettingsService');


exports.listIndicators = async (req, res) => {
  let data = { user: req.user, is_admin: req.is_admin };
  data.can_visualize = await appSettings.canVisualize();
  let available_years = await appSettings.getAvailableYears();
  data.min_year = available_years[0]
  data.max_year = available_years[available_years.length - 1]

  return res.render('select-report', data);
};

exports.getIndicator = async (req, res) => {
  let data = { user: req.user, is_admin: req.is_admin };
  data.can_visualize = await appSettings.canVisualize();
  let available_years = await appSettings.getAvailableYears();
  data.selected_report = req.body.report;
  data.from_year = req.body.from_year;
  data.to_year = req.body.to_year;
  data.min_year = available_years[0]
  data.max_year = available_years[available_years.length - 1];
  switch (req.body.report) {
    case 'porcentaje_graduados': {
      data.indicator_name = 'Porcentaje de graduación de beneficiarios de C.E. de pregrado, que debería(n) graduarse en el año que se está reportando';
      return porcentajeGraduados(req, res, data);
    }
    case 'financiamiento_anual': {
      data.indicator_name = 'Monto promedio de crédito educativo por año';
      return financiamientoAnual(req, res, data);
    }
    case 'financiamiento_beneficiario': {
      data.indicator_name = 'Monto promedio de crédito educativo por beneficiario para el año que se reporta';
      return financiamientoBeneficiario(req, res, data);
    }
    case 'financiamiento_institucion': {
      data.indicator_name = 'Monto promedio de crédito educativo por beneficiario desde el inicio del programa de CE hasta el año que se reporta';
      return financiamientoInstitucion(req, res, data);
    }
    case 'financiamiento_fuentes': {
      data.indicator_name = 'Proporción de financiación de CE según fuente de financiamiento por año - ' + getFinancingSource(req.body.source);
      return financiamientoFuentes(req, res, data);
    }
    case 'variacion_anual': {
      data.indicator_name = 'Variación anual de CE';
      return variacionAnual(req, res, data);
    }
    case 'asignacion_lugar': {
      data.indicator_name = 'Proporción de CE según el lugar de estudios - ' + getFinancingSource(req.body.place);
      return asignacionLugar(req, res, data);
    }
    case 'asignacion_nivel': {
      data.indicator_name = 'Proporción de CE según el nivel de estudios - ' + getFinancingSource(req.body.level);
      return asignacionNivel(req, res, data);
    }
    case 'asignacion_genero': {
      data.indicator_name = 'Proporción de CE según el género - ' + getFinancingSource(req.body.sex);
      return asignacionGenero(req, res, data);
    }
    case 'asignacion_nuevo': {
      data.indicator_name = 'Proporción anual de CE nuevo según el lugar de estudios - ' + getFinancingSource(req.body.place);
      return asignacionNuevoLugar(req, res, data);
    }
    case 'asignacion_nuevo_nivel': {
      data.indicator_name = 'Proporción anual de CE nuevo según el nivel de estudios - ' + getFinancingSource(req.body.level);
      return asignacionNuevoNivel(req, res, data);
    }
    case 'variacion_cartera_vigente': {
      data.indicator_name = 'Variación anual de la cartera vigente';
      return variacionCarteraVigente(req, res, data);
    }
    case 'variacion_cartera_vencida': {
      data.indicator_name = 'Variación anual de la cartera vencida';
      return variacionCarteraVencida(req, res, data);
    }
    case 'cartera_vigente_nivel': {
      data.indicator_name = 'Proporción anual de la cartera vigente según el nivel de estudios - ' + getFinancingSource(req.body.level);
      return carteraVigenteNivel(req, res, data);
    }
    case 'cartera_vigente_lugar': {
      data.indicator_name = 'Proporción anual de la cartera vigente según el lugar de estudios - ' + getFinancingSource(req.body.place);
      return carteraVigenteLugar(req, res, data);
    }
    case 'cartera_vigente_genero': {
      data.indicator_name = 'Proporción anual de la cartera vigente según el género - ' + getFinancingSource(req.body.sex);
      return carteraVigenteGenero(req, res, data);
    }
    case 'cartera_vencida': {
      data.indicator_name = 'Proporción anual de la cartera vencida';
      return carteraVencida(req, res, data);
    }
    case 'cartera_vencida_nivel': {
      data.indicator_name = 'Proporción anual de la cartera vencida según el nivel de estudios - ' + getFinancingSource(req.body.level);
      return carteraVencidaNivel(req, res, data);
    }
    case 'cartera_vencida_lugar': {
      data.indicator_name = 'Proporción anual de la cartera vencida según el lugar de estudios - ' + getFinancingSource(req.body.place);
      return carteraVencidaLugar(req, res, data);
    }
    case 'cartera_vencida_genero': {
      data.indicator_name = 'Proporción anual de la cartera vencida según el género - ' + getFinancingSource(req.body.sex);
      return carteraVencidaGenero(req, res, data);
    }
    case 'empleado_beneficiario': {
      data.indicator_name = 'Relación empleado-beneficiario de CE';
      return empleadoBeneficiario(req, res, data);
    }
    case 'plataforma': {
      data.indicator_name = 'Proporción de ICE con plataforma tecnológica';
      return plataformaTecnologica(req, res, data);
    }
    case 'regulacion': {
      data.indicator_name = 'Proporción de ICE reguladas';
      return regulacion(req, res, data);
    }
    case 'calificacion': {
      data.indicator_name = 'Proporción de ICE calificadas';
      return calificacion(req, res, data);
    }
    default: {
      data.error = "No ha seleccionado un indicador válido";
      return res.render('select-report', data);
    }
  }
};

const porcentajeGraduados = async (req, res, data) => {
  const formData = req.body;
  const source = formData.source;
  const years = formData.to_year - formData.from_year + 1;
  if (years >= 0 && years <= 10) {
    try {
      const reportsSnapshot = await db.collection('reports')
        .where('status', '==', 'Aceptado')
        .where('reported_year', '>=', Number(formData.from_year))
        .where('reported_year', '<=', Number(formData.to_year))
        .get();
      if (reportsSnapshot.empty) {
        console.log('No documents found.');
        data.warning = 'No hay datos reportados en el periodo seleccionado.';
      } else {
        let reports = reportsSnapshot.docs.map(doc => doc.data());
        // console.log(reports);
        let userCache = {};
        let results = [];
        for (let i = formData.from_year; i <= formData.to_year; i++) {
          let result = { reported_year: Number(i) };
          results.push(result);
        }

        const additionalColumns = [
          { name: 'Total Graduados (pregrado)', format: 'percentage'},
          { name: 'Total Graduados (postgrado)', format: 'percentage'},
          { name: 'Total Beneficiarios', format: 'number'}
        ];
        for (let i = 0; i < reports.length; i++) {
          let total_beneficiaries = 0;
          let pregrado_graduate = !isNaN(Number(reports[i].pregrado_graduate_percentage)) ? Number(reports[i].pregrado_graduate_percentage) : 0;
          let postgrado_graduate = !isNaN(Number(reports[i].posgrado_graduate_percentage)) ? Number(reports[i].posgrado_graduate_percentage) : 0;
          if (reports[i].programs && reports[i].programs instanceof Array) {
            for (let j = 0; j < reports[i].programs.length; j++) {
              const program = reports[i].programs[j];
              //console.log(program);
              if (program.beneficiaries) {
                total_beneficiaries += !isNaN(Number(program.beneficiaries))? Number(program.beneficiaries) : 0;
              }
            }
          }
           
          let indicatorValue = (pregrado_graduate / total_beneficiaries)*100;
          if (indicatorValue) {
            // console.log(indicatorValue);
            indicatorValue = indicatorValue.toFixed(2);
            if (userCache[reports[i].user_id]) {
              results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [indicatorValue, pregrado_graduate, postgrado_graduate, total_beneficiaries];
            } else {
              const userRecord = await admin.auth().getUser(reports[i].user_id);
              userCache[reports[i].user_id] = userRecord.displayName;
              results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [indicatorValue, pregrado_graduate, postgrado_graduate, total_beneficiaries];
            }
          }
        }

        let institutionNames = [];
        Object.keys(userCache).forEach(key => institutionNames.push(userCache[key]));

        data.line_chart_results = results;
        data.table_results = tableResults(results, institutionNames, 3); // length of additional columns + indicator
        data.institution_names = institutionNames;
        data.type = 'percentage';
        data.additional_columns = additionalColumns;
        // console.log(data.line_chart_results, data.table_results);
      }
      return res.render('select-report', data);
    } catch(error) {
      console.log('Error: ', error);
      data.error = 'No se han podido recuperar los datos de la institución. Contacte al administrador.';
      return res.render('select-report', data);
    }
  } else {
    data.error = 'Rango de años invalido. (0 <= rango <= 10)';
    return res.render('select-report', data);
  }
};


const financiamientoAnual = async (req, res, data) => {
  const formData = req.body;
  const years = formData.to_year - formData.from_year + 1;
  if (years >= 0 && years <= 10) {
    try {
      const reportsSnapshot = await db.collection('reports')
        .where('status', '==', 'Aceptado')
        .where('reported_year', '>=', Number(formData.from_year))
        .where('reported_year', '<=', Number(formData.to_year))
        .get();
      if (reportsSnapshot.empty) {
        console.log('No documents found.');
        data.warning = 'No hay datos reportados en el periodo seleccionado.';
      } else {
        let reports = reportsSnapshot.docs.map(doc => doc.data());
        // console.log(reports);
        let userCache = {};
        let results = [];
        for (let i = formData.from_year; i <= formData.to_year; i++) {
          let result = { reported_year: Number(i) };
          results.push(result);
        }
        const additionalColumns = [
          { name: 'Total Inversión', format: 'money'},
          { name: 'Total Créditos', format: 'number'}
        ];

        for (let i = 0; i < reports.length; i++) {
          let total_investment = 0;
          let total_credits = 0;
          if (reports[i].programs && reports[i].programs instanceof Array) {
            for (let j = 0; j < reports[i].programs.length; j++) {
              const program = reports[i].programs[j];
              // console.log(program);
              if (program.investment)
                total_investment += Number(program.investment);
              
              if (program.credit_pais) {
                if (program.credit_pais.new)
                  total_credits += Number(program.credit_pais.new);

                if (program.credit_pais.old)
                  total_credits += Number(program.credit_pais.old);
              }

              if (program.credit_exterior) {
                if (program.credit_exterior.new)
                  total_credits += Number(program.credit_exterior.new);

                if (program.credit_exterior.old)
                  total_credits += Number(program.credit_exterior.old);
              }
            }
          }

          let indicatorValue = total_investment / total_credits;
          if (indicatorValue) {
            // console.log(indicatorValue);
            indicatorValue = indicatorValue.toFixed(2);
            if (userCache[reports[i].user_id]) {
              results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [indicatorValue, total_investment, total_credits];
            } else {
              const userRecord = await admin.auth().getUser(reports[i].user_id);
              userCache[reports[i].user_id] = userRecord.displayName;
              results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [indicatorValue, total_investment, total_credits];
            }
          }
        }

        let institutionNames = [];
        Object.keys(userCache).forEach(key => institutionNames.push(userCache[key]));

        data.line_chart_results = results;
        data.first_indicator_label = 'Promedio';
        data.table_results = tableResults(results, institutionNames, 3); // length of additional columns + indicator
        data.institution_names = institutionNames;
        data.type = 'money';
        data.additional_columns = additionalColumns;
        // console.log(data.line_chart_results, data.table_results);
      }
      return res.render('select-report', data);
    } catch(error) {
      console.log('Error: ', error);
      data.error = 'No se han podido recuperar los datos de la institución. Contacte al administrador.';
      return res.render('select-report', data);
    }
  } else {
    data.error = 'Rango de años invalido. (0 <= rango <= 10)';
    return res.render('select-report', data);
  }
};

const financiamientoBeneficiario = async (req, res, data) => {
  const formData = req.body;
  const years = formData.to_year - formData.from_year + 1;
  if (years >= 0 && years <= 10) {
    try {
      const reportsSnapshot = await db.collection('reports')
        .where('status', '==', 'Aceptado')
        .where('reported_year', '>=', Number(formData.from_year))
        .where('reported_year', '<=', Number(formData.to_year))
        .get();
      if (reportsSnapshot.empty) {
        console.log('No documents found.');
        data.warning = 'No hay datos reportados en el periodo seleccionado.';
      } else {
        let reports = reportsSnapshot.docs.map(doc => doc.data());
        // console.log(reports);
        let userCache = {};
        let results = [];
        for (let i = formData.from_year; i <= formData.to_year; i++) {
          let result = { reported_year: Number(i) };
          results.push(result);
        }
        const additionalColumns = [
          { name: 'Total Inversión', format: 'money'},
          { name: 'Total Beneficiarios', format: 'number'}
        ];

        for (let i = 0; i < reports.length; i++) {
          let total_investment = 0;
          let total_beneficiaries = 0;
          if (reports[i].programs && reports[i].programs instanceof Array) {
            for (let j = 0; j < reports[i].programs.length; j++) {
              const program = reports[i].programs[j];
              // console.log(program);
              if (program.investment)
                total_investment += Number(program.investment);

              if (program.beneficiaries) {
                total_beneficiaries += Number(program.beneficiaries);
              }
            }
          }

          let indicatorValue = total_investment / total_beneficiaries;
          if (indicatorValue) {
            // console.log(indicatorValue);
            indicatorValue = indicatorValue.toFixed(2);
            if (userCache[reports[i].user_id]) {
              results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [indicatorValue, total_investment, total_beneficiaries];
            } else {
              const userRecord = await admin.auth().getUser(reports[i].user_id);
              userCache[reports[i].user_id] = userRecord.displayName;
              results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [indicatorValue, total_investment, total_beneficiaries];
            }
          }
        }

        let institutionNames = [];
        Object.keys(userCache).forEach(key => institutionNames.push(userCache[key]));

        data.line_chart_results = results;
        data.first_indicator_label = 'Promedio';
        data.table_results = tableResults(results, institutionNames, 3);
        data.institution_names = institutionNames;
        data.type = 'money';
        data.additional_columns = additionalColumns;
        // console.log(data.line_chart_results, data.table_results);
      }
      return res.render('select-report', data);
    } catch(error) {
      console.log('Error: ', error);
      data.error = 'No se han podido recuperar los datos de la institución. Contacte al administrador.';
      return res.render('select-report', data);
    }
  } else {
    data.error = 'Rango de años invalido. (0 <= rango <= 10)';
    return res.render('select-report', data);
  }
};

const financiamientoInstitucion = async (req, res, data) => {
  const formData = req.body;
  const years = formData.to_year - formData.from_year + 1;
  if (years >= 0 && years <= 10) {
    try {
      const reportsSnapshot = await db.collection('reports')
        .where('status', '==', 'Aceptado')
        .where('reported_year', '>=', Number(formData.from_year))
        .where('reported_year', '<=', Number(formData.to_year))
        .get();
      if (reportsSnapshot.empty) {
        console.log('No documents found.');
        data.warning = 'No hay datos reportados en el periodo seleccionado.';
      } else {
        let reports = reportsSnapshot.docs.map(doc => doc.data());
        // console.log(reports);
        let userCache = {};
        let results = [];
        for (let i = formData.from_year; i <= formData.to_year; i++) {
          let result = { reported_year: Number(i) };
          results.push(result);
        }
        const additionalColumns = [
          { name: 'Total Inversión', format: 'money'},
          { name: 'Total Estudiantes', format: 'number'}
        ];

        for (let i = 0; i < reports.length; i++) {
          const total_investment = reports[i].total_investment;
          const total_students = reports[i].total_students;
          let indicatorValue = total_investment / total_students;
          if (indicatorValue) {
            // console.log(indicatorValue);
            indicatorValue = indicatorValue.toFixed(2);
            if (userCache[reports[i].user_id]) {
              results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [indicatorValue, total_investment, total_students];
            } else {
              const userRecord = await admin.auth().getUser(reports[i].user_id);
              userCache[reports[i].user_id] = userRecord.displayName;
              results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [indicatorValue, total_investment, total_students];
            }
          }
        }

        let institutionNames = [];
        Object.keys(userCache).forEach(key => institutionNames.push(userCache[key]));

        data.bar_chart_results = results;
        data.first_indicator_label = 'Promedio';
        data.table_results = tableResults(results, institutionNames, 3);
        data.institution_names = institutionNames;
        data.type = 'money';
        data.additional_columns = additionalColumns;
        // console.log(data.bar_chart_results, data.table_results);
      }
      return res.render('select-report', data);
    } catch(error) {
      console.log('Error: ', error);
      data.error = 'No se han podido recuperar los datos de la institución. Contacte al administrador.';
      return res.render('select-report', data);
    }
  } else {
    data.error = 'Rango de años invalido. (0 <= rango <= 10)';
    return res.render('select-report', data);
  }
};

const financiamientoFuentes = async (req, res, data) => {
  const formData = req.body;
  const source = formData.source;
  const years = formData.to_year - formData.from_year + 1;
  if (years >= 0 && years <= 10) {
    try {
      const reportsSnapshot = await db.collection('reports')
        .where('status', '==', 'Aceptado')
        .where('reported_year', '>=', Number(formData.from_year))
        .where('reported_year', '<=', Number(formData.to_year))
        .get();
      if (reportsSnapshot.empty) {
        console.log('No documents found.');
        data.warning = 'No hay datos reportados en el periodo seleccionado.';
      } else {
        let reports = reportsSnapshot.docs.map(doc => doc.data());
        // console.log(reports);
        let userCache = {};
        let results = [];
        for (let i = formData.from_year; i <= formData.to_year; i++) {
          let result = { reported_year: Number(i) };
          results.push(result);
        }
        const additionalColumns = [
          { name: 'Total Financiamiento', format: 'money'}
        ];
        let funding_sources = {
          gubernamental: null,
          privado: null,
          nacional: null,
          internacional: null,
          donaciones: null,
          cartera: null,
          terceros: null,
          cooperacion: null,
          impuestos: null,
          titularizacion: null,
          propios: null,
          inversiones: null,
          otra: null
        };

        for (let i = 0; i < reports.length; i++) {
          let total_source_amount = 0;
          Object.keys(funding_sources).forEach(item => funding_sources[item] = null);
          
          if (reports[i].funding_sources && reports[i].funding_sources instanceof Array) {
            // console.log(reports[i].funding_sources);
            for (let j = 0; j < reports[i].funding_sources.length; j++) {
              total_source_amount += Number(reports[i].funding_sources[j].amount);
              funding_sources[reports[i].funding_sources[j].source] = reports[i].funding_sources[j].amount;
            }
          }

          if (source === 'todos') {
            let indicators = Object.values(funding_sources)
              .map(indicator => {
                return (indicator / total_source_amount * 100).toFixed(2);
              });
            indicators.push(total_source_amount);
            if (userCache[reports[i].user_id]) {
              results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = indicators;
            } else {
              const userRecord = await admin.auth().getUser(reports[i].user_id);
              userCache[reports[i].user_id] = userRecord.displayName;
              results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = indicators;
            }
          } else {
            let indicatorValue = funding_sources[source] / total_source_amount * 100;
            if (indicatorValue) {
              // console.log(indicatorValue);
              indicatorValue = indicatorValue.toFixed(2);
              if (userCache[reports[i].user_id]) {
                results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [indicatorValue, total_source_amount];
              } else {
                const userRecord = await admin.auth().getUser(reports[i].user_id);
                userCache[reports[i].user_id] = userRecord.displayName;
                results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [indicatorValue, total_source_amount];
              }
            }
          }
        }

        let institutionNames = [];
        Object.keys(userCache).forEach(key => institutionNames.push(userCache[key]));

        data.line_chart_results = results;
        if (source === 'todos') {
          data.table_results = tableResults(results, institutionNames, 14);
          data.indicator_labels = Object.keys(funding_sources).map(item => getFinancingSource(item)).slice(1);
        } else {
          data.table_results = tableResults(results, institutionNames, 2);
        }
        data.institution_names = institutionNames;
        data.type = 'percentage';
        data.first_indicator_label = getFinancingSource('gubernamental');
        data.source = source;
        data.additional_columns = additionalColumns;
        // console.log(data.line_chart_results, data.table_results);
      }
      return res.render('select-report', data);
    } catch(error) {
      console.log('Error: ', error);
      data.error = 'No se han podido recuperar los datos de la institución. Contacte al administrador.';
      return res.render('select-report', data);
    }
  } else {
    data.error = 'Rango de años invalido. (0 <= rango <= 10)';
    return res.render('select-report', data);
  }
};

const variacionAnual = async (req, res, data) => {
  const formData = req.body;
  const years = formData.to_year - formData.from_year + 1;
  if (years >= 0 && years <= 10) {
    try {
      const reportsSnapshot = await db.collection('reports')
        .where('status', '==', 'Aceptado')
        .where('reported_year', '>=', Number(formData.from_year - 1))
        .where('reported_year', '<=', Number(formData.to_year))
        .get();
      if (reportsSnapshot.empty) {
        console.log('No documents found.');
        data.warning = 'No hay datos reportados en el periodo seleccionado.';
      } else {
        let reports = reportsSnapshot.docs.map(doc => doc.data());
        // console.log(reports);
        let userCache = {};
        let results = [];
        for (let i = formData.from_year - 1; i <= formData.to_year; i++) {
          let result = { reported_year: Number(i) };
          results.push(result);
        }
        const additionalColumns = [
          { name: 'Total Créditos', format: 'number'}
        ];

        for (let i = 0; i < reports.length; i++) {
          let total_credits = 0;
          if (reports[i].programs && reports[i].programs instanceof Array) {
            for (let j = 0; j < reports[i].programs.length; j++) {
              const program = reports[i].programs[j];

              if (program.credit_pais) {
                if (program.credit_pais.new)
                  total_credits += Number(program.credit_pais.new);

                if (program.credit_pais.old)
                  total_credits += Number(program.credit_pais.old);
              }

              if (program.credit_exterior) {
                if (program.credit_exterior.new)
                  total_credits += Number(program.credit_exterior.new);

                if (program.credit_exterior.old)
                  total_credits += Number(program.credit_exterior.old);
              }
            }
          }

          let indicatorValue = total_credits;
          if (indicatorValue) {
            // console.log(indicatorValue);
            // indicatorValue = indicatorValue.toFixed(2);
            if (userCache[reports[i].user_id]) {
              results[reports[i].reported_year - formData.from_year + 1][userCache[reports[i].user_id]] = [indicatorValue, total_credits];
            } else {
              const userRecord = await admin.auth().getUser(reports[i].user_id);
              userCache[reports[i].user_id] = userRecord.displayName;
              results[reports[i].reported_year - formData.from_year + 1][userCache[reports[i].user_id]] = [indicatorValue, total_credits];
            }
          }
        }

        let institutionNames = [];
        Object.keys(userCache).forEach(key => institutionNames.push(userCache[key]));

        let variationResults = [];
        for (let i = 1; i < results.length; i++) {
          const obj = { reported_year: Number(results[i].reported_year) };
          for (let j = 0; j < institutionNames.length; j++) {
            let key = institutionNames[j];
            if (results[i][key] && results[i - 1][key]) {
              obj[key] = [((results[i][key][0] - results[i - 1][key][0]) / results[i - 1][key][0] * 100).toFixed(2), results[i][key][1]];
            } else if (results[i - 1][key]) {
              obj[key] = [-100, null];
            } else if (results[i][key]) {
              obj[key] = [100, results[i][key][1]];
            } else {
              obj[key] = [0, null];
            }
          }
          variationResults.push(obj);
        }

        data.line_chart_results = variationResults;
        data.table_results = tableResults(variationResults, institutionNames, 1);
        data.institution_names = institutionNames;
        data.type = 'percentage';
        data.additional_columns = additionalColumns;
        // console.log(data.line_chart_results, data.table_results);
      }
      return res.render('select-report', data);
    } catch(error) {
      console.log('Error: ', error);
      data.error = 'No se han podido recuperar los datos de la institución. Contacte al administrador.';
      return res.render('select-report', data);
    }
  } else {
    data.error = 'Rango de años invalido. (0 <= rango <= 10)';
    return res.render('select-report', data);
  }
};

const asignacionLugar = async (req, res, data) => {
  const formData = req.body;
  const place = formData.place;
  const years = formData.to_year - formData.from_year + 1;
  if (years >= 0 && years <= 10) {
    try {
      const reportsSnapshot = await db.collection('reports')
        .where('status', '==', 'Aceptado')
        .where('reported_year', '>=', Number(formData.from_year))
        .where('reported_year', '<=', Number(formData.to_year))
        .get();
      if (reportsSnapshot.empty) {
        console.log('No documents found.');
        data.warning = 'No hay datos reportados en el periodo seleccionado.';
      } else {
        let reports = reportsSnapshot.docs.map(doc => doc.data());
        // console.log(reports);
        let userCache = {};
        let results = [];
        for (let i = formData.from_year; i <= formData.to_year; i++) {
          let result = { reported_year: Number(i) };
          results.push(result);
        }
        const additionalColumns = [
          { name: 'Total Créditos', format: 'number'}
        ];

        for (let i = 0; i < reports.length; i++) {
          let place_credits = 0;
          let total_credits = 0;
          let pais_credits = 0;
          let exterior_credits = 0;
          if (reports[i].programs && reports[i].programs instanceof Array) {
            for (let j = 0; j < reports[i].programs.length; j++) {
              const program = reports[i].programs[j];

              if (program.credit_pais) {
                if (program.credit_pais.new) {
                  total_credits += Number(program.credit_pais.new);
                  if (place === 'pais')
                    place_credits += Number(program.credit_pais.new);
                  if (place === 'todos')
                    pais_credits += Number(program.credit_pais.new);
                }

                if (program.credit_pais.old) {
                  total_credits += Number(program.credit_pais.old);
                  if (place === 'pais')
                    place_credits += Number(program.credit_pais.old);
                  if (place === 'todos')
                    pais_credits += Number(program.credit_pais.old);
                }
              }

              if (program.credit_exterior) {
                if (program.credit_exterior.new) {
                  total_credits += Number(program.credit_exterior.new);
                  if (place === 'exterior')
                    place_credits += Number(program.credit_exterior.new);
                  if (place === 'todos')
                    exterior_credits += Number(program.credit_exterior.new);
                }

                if (program.credit_exterior.old) {
                  total_credits += Number(program.credit_exterior.old);
                  if (place === 'exterior')
                    place_credits += Number(program.credit_exterior.old);
                  if (place === 'todos')
                    exterior_credits += Number(program.credit_exterior.old);
                }
              }
            }
          }

          if (place === 'todos') {
            let paisIndicator = pais_credits / total_credits * 100;
            let exteriorIndicator = exterior_credits / total_credits * 100;
            if (!isNaN(paisIndicator) && !isNaN(exteriorIndicator)) {
              paisIndicator = paisIndicator.toFixed(2);
              exteriorIndicator = exteriorIndicator.toFixed(2);
              if (userCache[reports[i].user_id]) {
                results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [paisIndicator, exteriorIndicator, total_credits];
              } else {
                const userRecord = await admin.auth().getUser(reports[i].user_id);
                userCache[reports[i].user_id] = userRecord.displayName;
                results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [paisIndicator, exteriorIndicator, total_credits];
              }
            }
          } else {
            let indicatorValue = place_credits / total_credits * 100;
            if (indicatorValue) {
              // console.log(indicatorValue);
              indicatorValue = indicatorValue.toFixed(2);
              if (userCache[reports[i].user_id]) {
                results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [indicatorValue, total_credits];
              } else {
                const userRecord = await admin.auth().getUser(reports[i].user_id);
                userCache[reports[i].user_id] = userRecord.displayName;
                results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [indicatorValue, total_credits];
              }
            }
          }
        }

        let institutionNames = [];
        Object.keys(userCache).forEach(key => institutionNames.push(userCache[key]));
        data.institution_names = institutionNames;
        data.bar_chart_results = results;
        if (place === 'todos') {
          data.table_results = tableResults(results, institutionNames, 3);
          data.indicator_labels = ['Exterior'];
          let barChart = barChartResults(results, institutionNames, ['Pais', 'Exterior'])
          data.color_group = 2;
          data.bar_chart_results = barChart.results;
          data.institution_names = barChart.institutionNames;
        }
        else {
          data.table_results = tableResults(results, institutionNames, 2);
        }
        
        data.type = 'percentage';
        data.first_indicator_label = 'País';
        if (place == 'exterior'){
          data.first_indicator_label = 'Exterior';
        }
        data.place = place;
        data.additional_columns = additionalColumns;
        // console.log(data.bar_chart_results, data.table_results);
      }
      return res.render('select-report', data);
    } catch(error) {
      console.log('Error: ', error);
      data.error = 'No se han podido recuperar los datos de la institución. Contacte al administrador.';
      return res.render('select-report', data);
    }
  } else {
    data.error = 'Rango de años invalido. (0 <= rango <= 10)';
    return res.render('select-report', data);
  }
};

const asignacionNivel = async (req, res, data) => {
  const formData = req.body;
  const level = formData.level;
  const years = formData.to_year - formData.from_year + 1;
  if (years >= 0 && years <= 10) {
    try {
      const reportsSnapshot = await db.collection('reports')
        .where('status', '==', 'Aceptado')
        .where('reported_year', '>=', Number(formData.from_year))
        .where('reported_year', '<=', Number(formData.to_year))
        .get();
      if (reportsSnapshot.empty) {
        console.log('No documents found.');
        data.warning = 'No hay datos reportados en el periodo seleccionado.';
      } else {
        let reports = reportsSnapshot.docs.map(doc => doc.data());
        // console.log(reports);
        let userCache = {};
        let results = [];
        for (let i = formData.from_year; i <= formData.to_year; i++) {
          let result = { reported_year: Number(i) };
          results.push(result);
        }
        const additionalColumns = [
          { name: 'Total Créditos', format: 'number'}
        ];

        for (let i = 0; i < reports.length; i++) {
          let level_credits = 0;
          let total_credits = 0;
          let pregrado_credits = 0;
          let posgrado_credits = 0;
          if (reports[i].programs && reports[i].programs instanceof Array) {
            for (let j = 0; j < reports[i].programs.length; j++) {
              const program = reports[i].programs[j];

              if (program.credit_pais) {
                if (program.credit_pais.new) {
                  total_credits += !isNaN(Number(program.credit_pais.new)) ? Number(program.credit_pais.new) : 0;
                  if (program.level === level)
                    level_credits += !isNaN(Number(program.credit_pais.new)) ? Number(program.credit_pais.new) : 0;
                  if (level === 'todos') {
                    if (program.level === 'pregrado')
                      pregrado_credits += !isNaN(Number(program.credit_pais.new)) ? Number(program.credit_pais.new) : 0;
                    else
                      posgrado_credits += !isNaN(Number(program.credit_pais.new)) ? Number(program.credit_pais.new) : 0;
                  }
                }

                if (program.credit_pais.old) {
                  total_credits += !isNaN(Number(program.credit_pais.old)) ? Number(program.credit_pais.old) : 0;
                  if (program.level === level)
                    level_credits += !isNaN(Number(program.credit_pais.old)) ? Number(program.credit_pais.old) : 0;
                  if (level === 'todos') {
                    if (program.level === 'pregrado')
                      pregrado_credits += !isNaN(Number(program.credit_pais.old)) ? Number(program.credit_pais.old) : 0;
                    else
                      posgrado_credits += !isNaN(Number(program.credit_pais.old)) ? Number(program.credit_pais.old) : 0;
                  }
                }
              }

              if (program.credit_exterior) {
                if (program.credit_exterior.new) {
                  total_credits += !isNaN(Number(program.credit_exterior.new)) ? Number(program.credit_exterior.new) : 0;
                  if (program.level === level)
                    level_credits += !isNaN(Number(program.credit_exterior.new)) ? Number(program.credit_exterior.new) : 0;
                  if (level === 'todos') {
                    if (program.level === 'pregrado')
                      pregrado_credits += !isNaN(Number(program.credit_exterior.new)) ? Number(program.credit_exterior.new) : 0;
                    else
                      posgrado_credits += !isNaN(Number(program.credit_exterior.new)) ? Number(program.credit_exterior.new) : 0;
                  }
                }

                if (program.credit_exterior.old) {
                  total_credits += !isNaN(Number(program.credit_exterior.old)) ? Number(program.credit_exterior.old) : 0;
                  if (program.level === level)
                    level_credits += !isNaN(Number(program.credit_exterior.old)) ? Number(program.credit_exterior.old) : 0;
                  if (level === 'todos') {
                    if (program.level === 'pregrado')
                      pregrado_credits += !isNaN(Number(program.credit_exterior.old)) ? Number(program.credit_exterior.old) : 0;
                    else
                      posgrado_credits += !isNaN(Number(program.credit_exterior.old)) ? Number(program.credit_exterior.old) : 0;
                  }
                }
              }
            }
          }

          if (level === 'todos') {
            let pregradoIndicator = pregrado_credits / total_credits * 100;
            let posgradoIndicator = posgrado_credits / total_credits * 100;
            if (!isNaN(pregradoIndicator) && !isNaN(posgradoIndicator)) {
              pregradoIndicator = pregradoIndicator.toFixed(2);
              posgradoIndicator = posgradoIndicator.toFixed(2);
              if (userCache[reports[i].user_id]) {
                results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [pregradoIndicator, posgradoIndicator, total_credits];
              } else {
                const userRecord = await admin.auth().getUser(reports[i].user_id);
                userCache[reports[i].user_id] = userRecord.displayName;
                results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [pregradoIndicator, posgradoIndicator, total_credits];
              }
            }
          } else {
            let indicatorValue = level_credits / total_credits * 100;
            if (indicatorValue) {
              // console.log(indicatorValue);
              indicatorValue = indicatorValue.toFixed(2);
              if (userCache[reports[i].user_id]) {
                results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [indicatorValue, total_credits];
              } else {
                const userRecord = await admin.auth().getUser(reports[i].user_id);
                userCache[reports[i].user_id] = userRecord.displayName;
                results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [indicatorValue, total_credits];
              }
            }
          }
        }

        let institutionNames = [];
        Object.keys(userCache).forEach(key => institutionNames.push(userCache[key]));
        data.institution_names = institutionNames;
        data.bar_chart_results = results;
        if (level === 'todos') {
          data.table_results = tableResults(results, institutionNames, 3);
          data.indicator_labels = ['Posgrado'];
          let barChart = barChartResults(results, institutionNames, ['Pregrado', 'Posgrado'])
          data.color_group = 2;
          data.bar_chart_results = barChart.results;
          data.institution_names = barChart.institutionNames;
        } else {
          data.table_results = tableResults(results, institutionNames, 2);
        }
        data.type = 'percentage';
        data.first_indicator_label = 'Pregrado';
        if (level == 'posgrado'){
          data.first_indicator_label = 'Posgrado'
        }
        data.level = level;
        data.additional_columns = additionalColumns;
        // console.log(data.bar_chart_results, data.table_results);
      }
      return res.render('select-report', data);
    } catch(error) {
      console.log('Error: ', error);
      data.error = 'No se han podido recuperar los datos de la institución. Contacte al administrador.';
      return res.render('select-report', data);
    }
  } else {
    data.error = 'Rango de años invalido. (0 <= rango <= 10)';
    return res.render('select-report', data);
  }
};

const asignacionGenero = async (req, res, data) => {
  const formData = req.body;
  const sex = formData.sex;
  const years = formData.to_year - formData.from_year + 1;
  if (years >= 0 && years <= 10) {
    try {
      const reportsSnapshot = await db.collection('reports')
        .where('status', '==', 'Aceptado')
        .where('reported_year', '>=', Number(formData.from_year))
        .where('reported_year', '<=', Number(formData.to_year))
        .get();
      if (reportsSnapshot.empty) {
        console.log('No documents found.');
        data.warning = 'No hay datos reportados en el periodo seleccionado.';
      } else {
        let reports = reportsSnapshot.docs.map(doc => doc.data());
        // console.log(reports);
        let userCache = {};
        let results = [];
        for (let i = formData.from_year; i <= formData.to_year; i++) {
          let result = { reported_year: Number(i) };
          results.push(result);
        }
        const additionalColumns = [
          { name: 'Total Créditos', format: 'number'}
        ];

        for (let i = 0; i < reports.length; i++) {
          let pregrado_female_credits = !isNaN(Number(reports[i].pregrado_female_students)) ? Number(reports[i].pregrado_female_students) : 0;
          let posgrado_female_credits = !isNaN(Number(reports[i].posgrado_female_students)) ? Number(reports[i].posgrado_female_students) : 0;
          let pregrado_male_credits = !isNaN(Number(reports[i].pregrado_male_students )) ? Number(reports[i].pregrado_male_students ) : 0;
          let posgrado_male_credits = !isNaN(Number(reports[i].posgrado_male_students)) ? Number(reports[i].posgrado_male_students) : 0;
          let female_credits = pregrado_female_credits + posgrado_female_credits;
          let male_credits = pregrado_male_credits + posgrado_male_credits;
          let total_credits = female_credits + male_credits;
          let indicatorValue;
          let femaleIndicator;
          let maleIndicator;
          if (sex === 'femenino') {
            indicatorValue = female_credits / total_credits * 100;
          } else if (sex === 'masculino') {
            indicatorValue = male_credits / total_credits * 100;
          } else {
            femaleIndicator = female_credits / total_credits * 100;
            maleIndicator = male_credits / total_credits * 100;
          }

          if (sex === 'todos') {
            let femaleIndicator = female_credits / total_credits * 100;
            let maleIndicator = male_credits / total_credits * 100;
            if (!isNaN(femaleIndicator) && !isNaN(maleIndicator)) {
              femaleIndicator = femaleIndicator.toFixed(2);
              maleIndicator = maleIndicator.toFixed(2);
              if (userCache[reports[i].user_id]) {
                results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [femaleIndicator, maleIndicator, total_credits];
              } else {
                const userRecord = await admin.auth().getUser(reports[i].user_id);
                userCache[reports[i].user_id] = userRecord.displayName;
                results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [femaleIndicator, maleIndicator, total_credits];
              }
            }
          } else {
            if (indicatorValue) {
              // console.log(indicatorValue);
              indicatorValue = indicatorValue.toFixed(2);
              if (userCache[reports[i].user_id]) {
                results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [indicatorValue, total_credits];
              } else {
                const userRecord = await admin.auth().getUser(reports[i].user_id);
                userCache[reports[i].user_id] = userRecord.displayName;
                results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [indicatorValue, total_credits];
              }
            }
          }
        }

        let institutionNames = [];
        Object.keys(userCache).forEach(key => institutionNames.push(userCache[key]));
        data.institution_names = institutionNames;
        data.bar_chart_results = results;
        if (sex === 'todos') {
          data.table_results = tableResults(results, institutionNames, 3);
          data.indicator_labels = ['Masculino'];
          let barChart = barChartResults(results, institutionNames, ['Femenino', 'Masculino'])
          data.color_group = 2;
          data.bar_chart_results = barChart.results;
          data.institution_names = barChart.institutionNames;
        } else {
          data.table_results = tableResults(results, institutionNames, 2);
        }
        data.type = 'percentage';
        data.first_indicator_label = 'Femenino';
        if (sex == 'masculino'){
          data.first_indicator_label = 'Masculino';
        }

        data.sex = sex;
        data.additional_columns = additionalColumns;
        // console.log(data.bar_chart_results, data.table_results);
      }
      return res.render('select-report', data);
    } catch(error) {
      console.log('Error: ', error);
      data.error = 'No se han podido recuperar los datos de la institución. Contacte al administrador.';
      return res.render('select-report', data);
    }
  } else {
    data.error = 'Rango de años invalido. (0 <= rango <= 10)';
    return res.render('select-report', data);
  }
};

const asignacionNuevoLugar = async (req, res, data) => {
  const formData = req.body;
  const place = formData.place;
  const years = formData.to_year - formData.from_year + 1;
  if (years >= 0 && years <= 10) {
    try {
      const reportsSnapshot = await db.collection('reports')
        .where('status', '==', 'Aceptado')
        .where('reported_year', '>=', Number(formData.from_year))
        .where('reported_year', '<=', Number(formData.to_year))
        .get();
      if (reportsSnapshot.empty) {
        console.log('No documents found.');
        data.warning = 'No hay datos reportados en el periodo seleccionado.';
      } else {
        let reports = reportsSnapshot.docs.map(doc => doc.data());
        // console.log(reports);
        let userCache = {};
        let results = [];
        for (let i = formData.from_year; i <= formData.to_year; i++) {
          let result = { reported_year: Number(i) };
          results.push(result);
        }
        const additionalColumns = [
          { name: 'Total Créditos Nuevos', format: 'number'}
        ];

        for (let i = 0; i < reports.length; i++) {
          let total_new_credits = 0;
          let new_pais_credits = 0;
          let new_exterior_credits = 0;
          if (reports[i].programs && reports[i].programs instanceof Array) {
            for (let j = 0; j < reports[i].programs.length; j++) {
              const program = reports[i].programs[j];

              if (program.credit_pais && program.credit_pais.new) {
                total_new_credits += Number(program.credit_pais.new);
                if (place === 'pais' || place === 'todos') {
                  new_pais_credits += Number(program.credit_pais.new);
                }
              }

              if (program.credit_exterior && program.credit_exterior.new) {
                total_new_credits += Number(program.credit_exterior.new);
                if (place === 'exterior' || place === 'todos') {
                  new_exterior_credits += Number(program.credit_exterior.new);
                }
              }
            }
          }

          if (place === 'todos') {
            let paisIndicator = new_pais_credits / total_new_credits * 100;
            let exteriorIndicator = new_exterior_credits / total_new_credits * 100;
            if (!isNaN(paisIndicator) && !isNaN(exteriorIndicator)) {
              paisIndicator = paisIndicator.toFixed(2);
              exteriorIndicator = exteriorIndicator.toFixed(2);
              if (userCache[reports[i].user_id]) {
                results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [paisIndicator, exteriorIndicator, total_new_credits];
              } else {
                const userRecord = await admin.auth().getUser(reports[i].user_id);
                userCache[reports[i].user_id] = userRecord.displayName;
                results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [paisIndicator, exteriorIndicator, total_new_credits];
              }
            }
          } else {
            let indicatorValue;
            if (place === 'pais') {
              indicatorValue = new_pais_credits / total_new_credits * 100;
            } else {
              indicatorValue = new_exterior_credits / total_new_credits * 100;
            }
            if (indicatorValue) {
              // console.log(indicatorValue);
              indicatorValue = indicatorValue.toFixed(2);
              if (userCache[reports[i].user_id]) {
                results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [indicatorValue, total_new_credits];
              } else {
                const userRecord = await admin.auth().getUser(reports[i].user_id);
                userCache[reports[i].user_id] = userRecord.displayName;
                results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [indicatorValue, total_new_credits];
              }
            }
          }
        }

        let institutionNames = [];
        Object.keys(userCache).forEach(key => institutionNames.push(userCache[key]));
        data.institution_names = institutionNames;
        data.bar_chart_results = results;
        if (place === 'todos') {
          data.table_results = tableResults(results, institutionNames, 3);
          data.indicator_labels = ['Exterior'];
          let barChart = barChartResults(results, institutionNames, ['Pais', 'Exterior'])
          data.color_group = 2;
          data.bar_chart_results = barChart.results;
          data.institution_names = barChart.institutionNames;
        } else {
          data.table_results = tableResults(results, institutionNames, 2);
        }
        data.type = 'percentage';
        data.first_indicator_label = 'País';
        if (place == 'exterior'){
          data.first_indicator_label = 'Exterior';
        }
        data.place = place;
        data.additional_columns = additionalColumns;
        // console.log(data.bar_chart_results, data.table_results);
      }
      return res.render('select-report', data);
    } catch(error) {
      console.log('Error: ', error);
      data.error = 'No se han podido recuperar los datos de la institución. Contacte al administrador.';
      return res.render('select-report', data);
    }
  } else {
    data.error = 'Rango de años invalido. (0 <= rango <= 10)';
    return res.render('select-report', data);
  }
};

const asignacionNuevoNivel = async (req, res, data) => {
  const formData = req.body;
  const level = formData.level;
  const years = formData.to_year - formData.from_year + 1;
  if (years >= 0 && years <= 10) {
    try {
      const reportsSnapshot = await db.collection('reports')
        .where('status', '==', 'Aceptado')
        .where('reported_year', '>=', Number(formData.from_year))
        .where('reported_year', '<=', Number(formData.to_year))
        .get();
      if (reportsSnapshot.empty) {
        console.log('No documents found.');
        data.warning = 'No hay datos reportados en el periodo seleccionado.';
      } else {
        let reports = reportsSnapshot.docs.map(doc => doc.data());
        // console.log(reports);
        let userCache = {};
        let results = [];
        for (let i = formData.from_year; i <= formData.to_year; i++) {
          let result = { reported_year: Number(i) };
          results.push(result);
        }
        const additionalColumns = [
          { name: 'Total Créditos Nuevos', format: 'number'}
        ];

        for (let i = 0; i < reports.length; i++) {
          let total_new_credits = 0;
          let new_pregrado_credits = 0;
          let new_posgrado_credits = 0;
          if (reports[i].programs && reports[i].programs instanceof Array) {
            for (let j = 0; j < reports[i].programs.length; j++) {
              const program = reports[i].programs[j];
              if (program.level === level || level === 'todos') {
                if (program.credit_pais && program.credit_pais.new) {
                  total_new_credits += Number(program.credit_pais.new);
                  if (program.level === 'pregrado')
                    new_pregrado_credits += Number(program.credit_pais.new);
                  else
                    new_posgrado_credits += Number(program.credit_pais.new);
                }

                if (program.credit_exterior && program.credit_exterior.new) {
                  total_new_credits += Number(program.credit_exterior.new);
                  if (program.level === 'pregrado')
                    new_pregrado_credits += Number(program.credit_exterior.new);
                  else
                    new_posgrado_credits += Number(program.credit_exterior.new);
                }
              } else {
                if (program.credit_pais && program.credit_pais.new) {
                  total_new_credits += Number(program.credit_pais.new);
                }

                if (program.credit_exterior && program.credit_exterior.new) {
                  total_new_credits += Number(program.credit_exterior.new);
                }
              }
            }
          }

          if (level === 'todos') {
            let pregradoIndicator = new_pregrado_credits / total_new_credits * 100;
            let posgradoIndicator = new_posgrado_credits / total_new_credits * 100;
            if (!isNaN(pregradoIndicator) && !isNaN(posgradoIndicator)) {
              pregradoIndicator = pregradoIndicator.toFixed(2);
              posgradoIndicator = posgradoIndicator.toFixed(2);
              if (userCache[reports[i].user_id]) {
                results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [pregradoIndicator, posgradoIndicator, total_new_credits];
              } else {
                const userRecord = await admin.auth().getUser(reports[i].user_id);
                userCache[reports[i].user_id] = userRecord.displayName;
                results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [pregradoIndicator, posgradoIndicator, total_new_credits];
              }
            }
          } else {
            let indicatorValue;
            if (level === 'pregrado') {
              indicatorValue = new_pregrado_credits / total_new_credits * 100;
            } else {
              indicatorValue = new_posgrado_credits / total_new_credits * 100;
            }
            if (indicatorValue) {
              // console.log(indicatorValue);
              indicatorValue = indicatorValue.toFixed(2);
              if (userCache[reports[i].user_id]) {
                results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [indicatorValue, total_new_credits];
              } else {
                const userRecord = await admin.auth().getUser(reports[i].user_id);
                userCache[reports[i].user_id] = userRecord.displayName;
                results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [indicatorValue, total_new_credits];
              }
            }
          }
        }

        let institutionNames = [];
        Object.keys(userCache).forEach(key => institutionNames.push(userCache[key]));
        data.institution_names = institutionNames;
        data.bar_chart_results = results;
        if (level === 'todos') {
          data.table_results = tableResults(results, institutionNames, 3);
          data.indicator_labels = ['Posgrado'];
          let barChart = barChartResults(results, institutionNames, ['Pregrado', 'Posgrado'])
          data.color_group = 2;
          data.bar_chart_results = barChart.results;
          data.institution_names = barChart.institutionNames;
        } else {
          data.table_results = tableResults(results, institutionNames, 2);
        }
        data.type = 'percentage';
        data.first_indicator_label = 'Pregrado';
        if (level == 'posgrado'){
          data.first_indicator_label = 'Posgrado';
        }
        data.level = level;
        data.additional_columns = additionalColumns;
        // console.log(data.bar_chart_results, data.table_results);
      }
      return res.render('select-report', data);
    } catch(error) {
      console.log('Error: ', error);
      data.error = 'No se han podido recuperar los datos de la institución. Contacte al administrador.';
      return res.render('select-report', data);
    }
  } else {
    data.error = 'Rango de años invalido. (0 <= rango <= 10)';
    return res.render('select-report', data);
  }
};

const variacionCarteraVigente = async (req, res, data) => {
  const formData = req.body;
  const years = formData.to_year - formData.from_year + 1;
  if (years >= 0 && years <= 10) {
    try {
      const reportsSnapshot = await db.collection('reports')
        .where('status', '==', 'Aceptado')
        .where('reported_year', '>=', Number(formData.from_year) - 1)
        .where('reported_year', '<=', Number(formData.to_year))
        .get();
      if (reportsSnapshot.empty) {
        console.log('No documents found.');
        data.warning = 'No hay datos reportados en el periodo seleccionado.';
      } else {
        let reports = reportsSnapshot.docs.map(doc => doc.data());
        // console.log(reports);
        let userCache = {};
        let results = [];
        for (let i = formData.from_year - 1; i <= formData.to_year; i++) {
          let result = { reported_year: Number(i) };
          results.push(result);
        }
        const additionalColumns = [
          { name: 'Cartera Vigente', format: 'money'}
        ];

        for (let i = 0; i < reports.length; i++) {
          let total_portfolio = 0;
          if (reports[i].current_portfolio && reports[i].current_portfolio instanceof Array) {
            for (let j = 0; j < reports[i].current_portfolio.length; j++) {
              total_portfolio += Number(reports[i].current_portfolio[j].amount);
            }
          }
          // if (reports[i].pastdue_portfolio && reports[i].pastdue_portfolio instanceof Array) {
          //   for (let j = 0; j < reports[i].pastdue_portfolio.length; j++) {
          //     total_portfolio += Number(reports[i].pastdue_portfolio[j].amount);
          //   }
          // }
          // if (reports[i].execution_portfolio && reports[i].execution_portfolio instanceof Array) {
          //   for (let j = 0; j < reports[i].execution_portfolio.length; j++) {
          //     total_portfolio += Number(reports[i].execution_portfolio[j].amount);
          //   }
          // }

          let indicatorValue = total_portfolio;
          if (indicatorValue) {
            // console.log(indicatorValue);
            // indicatorValue = indicatorValue.toFixed(2);
            if (userCache[reports[i].user_id]) {
              results[reports[i].reported_year - formData.from_year + 1][userCache[reports[i].user_id]] = [indicatorValue, total_portfolio];
            } else {
              const userRecord = await admin.auth().getUser(reports[i].user_id);
              userCache[reports[i].user_id] = userRecord.displayName;
              results[reports[i].reported_year - formData.from_year + 1][userCache[reports[i].user_id]] = [indicatorValue, total_portfolio];
            }
          }
        }

        let institutionNames = [];
        Object.keys(userCache).forEach(key => institutionNames.push(userCache[key]));

        let variationResults = [];
        for (let i = 1; i < results.length; i++) {
          const obj = { reported_year: Number(results[i].reported_year) };
          for (let j = 0; j < institutionNames.length; j++) {
            let key = institutionNames[j];
            if (results[i][key] && results[i - 1][key]) {
              obj[key] = [((results[i][key][0] - results[i - 1][key][0]) / results[i - 1][key][0] * 100).toFixed(2), results[i][key][1]];
            } else if (results[i - 1][key]) {
              obj[key] = [-100, null];
            } else if (results[i][key]) {
              obj[key] = [100, results[i][key][1]];
            } else {
              obj[key] = [0, null];
            }
          }
          variationResults.push(obj);
        }

        data.line_chart_results = variationResults;
        data.table_results = tableResults(variationResults, institutionNames, 1);
        data.institution_names = institutionNames;
        data.type = 'percentage';
        data.additional_columns = additionalColumns;
        // console.log(data.line_chart_results, data.table_results);
      }
      return res.render('select-report', data);
    } catch(error) {
      console.log('Error: ', error);
      data.error = 'No se han podido recuperar los datos de la institución. Contacte al administrador.';
      return res.render('select-report', data);
    }
  } else {
    data.error = 'Rango de años invalido. (0 <= rango <= 10)';
    return res.render('select-report', data);
  }
};

const variacionCarteraVencida = async (req, res, data) => {
  const formData = req.body;
  const years = formData.to_year - formData.from_year + 1;
  if (years >= 0 && years <= 10) {
    try {
      const reportsSnapshot = await db.collection('reports')
        .where('status', '==', 'Aceptado')
        .where('reported_year', '>=', Number(formData.from_year) - 1)
        .where('reported_year', '<=', Number(formData.to_year))
        .get();
      if (reportsSnapshot.empty) {
        console.log('No documents found.');
        data.warning = 'No hay datos reportados en el periodo seleccionado.';
      } else {
        let reports = reportsSnapshot.docs.map(doc => doc.data());
        // console.log(reports);
        let userCache = {};
        let results = [];
        for (let i = formData.from_year - 1; i <= formData.to_year; i++) {
          let result = { reported_year: Number(i) };
          results.push(result);
        }
        const additionalColumns = [
          { name: 'Cartera Vencida', format: 'money'}
        ];

        for (let i = 0; i < reports.length; i++) {
          let total_portfolio = 0;
          // if (reports[i].current_portfolio && reports[i].current_portfolio instanceof Array) {
          //   for (let j = 0; j < reports[i].current_portfolio.length; j++) {
          //     total_portfolio += Number(reports[i].current_portfolio[j].amount);
          //   }
          // }
          if (reports[i].pastdue_portfolio && reports[i].pastdue_portfolio instanceof Array) {
            for (let j = 0; j < reports[i].pastdue_portfolio.length; j++) {
              total_portfolio += Number(reports[i].pastdue_portfolio[j].amount);
            }
          }
          // if (reports[i].execution_portfolio && reports[i].execution_portfolio instanceof Array) {
          //   for (let j = 0; j < reports[i].execution_portfolio.length; j++) {
          //     total_portfolio += Number(reports[i].execution_portfolio[j].amount);
          //   }
          // }

          let indicatorValue = total_portfolio;
          if (indicatorValue) {
            // console.log(indicatorValue);
            // indicatorValue = indicatorValue.toFixed(2);
            if (userCache[reports[i].user_id]) {
              results[reports[i].reported_year - formData.from_year + 1][userCache[reports[i].user_id]] = [indicatorValue, total_portfolio];
            } else {
              const userRecord = await admin.auth().getUser(reports[i].user_id);
              userCache[reports[i].user_id] = userRecord.displayName;
              results[reports[i].reported_year - formData.from_year + 1][userCache[reports[i].user_id]] = [indicatorValue, total_portfolio];
            }
          }
        }

        let institutionNames = [];
        Object.keys(userCache).forEach(key => institutionNames.push(userCache[key]));

        let variationResults = [];
        for (let i = 1; i < results.length; i++) {
          const obj = { reported_year: Number(results[i].reported_year) };
          for (let j = 0; j < institutionNames.length; j++) {
            let key = institutionNames[j];
            if (results[i][key] && results[i - 1][key]) {
              obj[key] = [((results[i][key][0] - results[i - 1][key][0]) / results[i - 1][key][0] * 100).toFixed(2), results[i][key][1]];
            } else if (results[i - 1][key]) {
              obj[key] = [-100, null];
            } else if (results[i][key]) {
              obj[key] = [100, results[i][key][1]];
            } else {
              obj[key] = [0, null];
            }
          }
          variationResults.push(obj);
        }

        data.line_chart_results = variationResults;
        data.table_results = tableResults(variationResults, institutionNames, 1);
        data.institution_names = institutionNames;
        data.type = 'percentage';
        data.additional_columns = additionalColumns;
        // console.log(data.line_chart_results, data.table_results);
      }
      return res.render('select-report', data);
    } catch(error) {
      console.log('Error: ', error);
      data.error = 'No se han podido recuperar los datos de la institución. Contacte al administrador.';
      return res.render('select-report', data);
    }
  } else {
    data.error = 'Rango de años invalido. (0 <= rango <= 10)';
    return res.render('select-report', data);
  }
};

const carteraVigenteNivel = async (req, res, data) => {
  const formData = req.body;
  const level = formData.level;
  const years = formData.to_year - formData.from_year + 1;
  if (years >= 0 && years <= 10) {
    try {
      const reportsSnapshot = await db.collection('reports')
        .where('status', '==', 'Aceptado')
        .where('reported_year', '>=', Number(formData.from_year))
        .where('reported_year', '<=', Number(formData.to_year))
        .get();
      if (reportsSnapshot.empty) {
        console.log('No documents found.');
        data.warning = 'No hay datos reportados en el periodo seleccionado.';
      } else {
        let reports = reportsSnapshot.docs.map(doc => doc.data());
        // console.log(reports);
        let userCache = {};
        let results = [];
        for (let i = formData.from_year; i <= formData.to_year; i++) {
          let result = { reported_year: Number(i) };
          results.push(result);
        }
        const additionalColumns = [
          { name: 'Cartera Vigente', format: 'money' }
        ];

        for (let i = 0; i < reports.length; i++) {
          let current_portfolio = 0;
          let level_portfolio = 0;
          let pregrado_portfolio = 0;
          let posgrado_portfolio = 0;
          if (reports[i].current_portfolio && reports[i].current_portfolio instanceof Array) {
            for (let j = 0; j < reports[i].current_portfolio.length; j++) {
              current_portfolio += Number(reports[i].current_portfolio[j].amount);
              if (reports[i].current_portfolio[j].name === level + '_pais'
                || reports[i].current_portfolio[j].name === level + '_exterior') {
                level_portfolio += Number(reports[i].current_portfolio[j].amount);
              } else {
                if (reports[i].current_portfolio[j].name === 'pregrado_pais' 
                  || reports[i].current_portfolio[j].name === 'pregrado_exterior') {
                  pregrado_portfolio += Number(reports[i].current_portfolio[j].amount);
                } else if (reports[i].current_portfolio[j].name === 'posgrado_pais'
                  || reports[i].current_portfolio[j].name === 'posgrado_exterior') {
                  posgrado_portfolio += Number(reports[i].current_portfolio[j].amount);
                }
              }
            }
          }

          if (level === 'todos') {
            let pregradoIndicator = pregrado_portfolio / current_portfolio * 100;
            let posgradoIndicator = posgrado_portfolio / current_portfolio * 100;
            if (pregradoIndicator || posgradoIndicator) {
              pregradoIndicator = isNaN(pregradoIndicator) ? 0 : pregradoIndicator.toFixed(2);
              posgradoIndicator = isNaN(posgradoIndicator) ? 0 : posgradoIndicator.toFixed(2);
              if (userCache[reports[i].user_id]) {
                results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [pregradoIndicator, posgradoIndicator, current_portfolio];
              } else {
                const userRecord = await admin.auth().getUser(reports[i].user_id);
                userCache[reports[i].user_id] = userRecord.displayName;
                results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [pregradoIndicator, posgradoIndicator, current_portfolio];
              }
            }
          } else {
            let indicatorValue = level_portfolio / current_portfolio * 100;
            // console.log(indicatorValue);
            indicatorValue = isNaN(indicatorValue) ? 0 : indicatorValue.toFixed(2);
            if (userCache[reports[i].user_id]) {
              results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [indicatorValue, current_portfolio];
            } else {
              const userRecord = await admin.auth().getUser(reports[i].user_id);
              userCache[reports[i].user_id] = userRecord.displayName;
              results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [indicatorValue, current_portfolio];
            }
          }
        }

        let institutionNames = [];
        Object.keys(userCache).forEach(key => institutionNames.push(userCache[key]));
        data.institution_names = institutionNames;
        data.bar_chart_results = results;
        if (level === 'todos') {
          data.table_results = tableResults(results, institutionNames, 3);
          data.indicator_labels = ['Posgrado'];
          let barChart = barChartResults(results, institutionNames, ['Pregrado', 'Posgrado'])
          data.color_group = 2;
          data.bar_chart_results = barChart.results;
          data.institution_names = barChart.institutionNames;
          data.line_chart_results = undefined;
        } else {
          data.table_results = tableResults(results, institutionNames, 2);
        }
        data.type = 'percentage';
        data.first_indicator_label = 'Pregrado';
        data.level = level;
        data.additional_columns = additionalColumns;
        // console.log(data.line_chart_results, data.table_results);
      }
      return res.render('select-report', data);
    } catch(error) {
      console.log('Error: ', error);
      data.error = 'No se han podido recuperar los datos de la institución. Contacte al administrador.';
      return res.render('select-report', data);
    }
  } else {
    data.error = 'Rango de años invalido. (0 <= rango <= 10)';
    return res.render('select-report', data);
  }
};

const carteraVigenteLugar = async (req, res, data) => {
  const formData = req.body;
  const place = formData.place;
  const years = formData.to_year - formData.from_year + 1;
  if (years >= 0 && years <= 10) {
    try {
      const reportsSnapshot = await db.collection('reports')
        .where('status', '==', 'Aceptado')
        .where('reported_year', '>=', Number(formData.from_year))
        .where('reported_year', '<=', Number(formData.to_year))
        .get();
      if (reportsSnapshot.empty) {
        console.log('No documents found.');
        data.warning = 'No hay datos reportados en el periodo seleccionado.';
      } else {
        let reports = reportsSnapshot.docs.map(doc => doc.data());
        // console.log(reports);
        let userCache = {};
        let results = [];
        for (let i = formData.from_year; i <= formData.to_year; i++) {
          let result = { reported_year: Number(i) };
          results.push(result);
        }
        const additionalColumns = [
          { name: 'Cartera Vigente', format: 'money'}
        ];

        for (let i = 0; i < reports.length; i++) {
          let current_portfolio = 0;
          let place_portfolio = 0;
          let pais_portfolio = 0;
          let exterior_portfolio = 0;
          if (reports[i].current_portfolio && reports[i].current_portfolio instanceof Array) {
            for (let j = 0; j < reports[i].current_portfolio.length; j++) {
              current_portfolio += Number(reports[i].current_portfolio[j].amount);
              if (reports[i].current_portfolio[j].name === 'pregrado_' + place
                || reports[i].current_portfolio[j].name === 'posgrado_' + place) {
                place_portfolio += Number(reports[i].current_portfolio[j].amount);
              } else {
                if (reports[i].current_portfolio[j].name === 'pregrado_pais' 
                  || reports[i].current_portfolio[j].name === 'posgrado_pais') {
                  pais_portfolio += Number(reports[i].current_portfolio[j].amount);
                } else if (reports[i].current_portfolio[j].name === 'pregrado_exterior'
                  || reports[i].current_portfolio[j].name === 'posgrado_exterior') {
                  exterior_portfolio += Number(reports[i].current_portfolio[j].amount);
                }
              }
            }
          }

          if (place === 'todos') {
            let paisIndicator = pais_portfolio / current_portfolio * 100;
            let exteriorIndicator = exterior_portfolio / current_portfolio * 100;
            if (paisIndicator || exteriorIndicator) {
              paisIndicator = isNaN(paisIndicator) ? 0 : paisIndicator.toFixed(2);
              exteriorIndicator = isNaN(exteriorIndicator) ? 0 : exteriorIndicator.toFixed(2);
              if (userCache[reports[i].user_id]) {
                results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [paisIndicator, exteriorIndicator, current_portfolio];
              } else {
                const userRecord = await admin.auth().getUser(reports[i].user_id);
                userCache[reports[i].user_id] = userRecord.displayName;
                results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [paisIndicator, exteriorIndicator, current_portfolio];
              }
            }
          } else {
            let indicatorValue = place_portfolio / current_portfolio * 100;
            indicatorValue = isNaN(indicatorValue) ? 0 : indicatorValue.toFixed(2);
            if (userCache[reports[i].user_id]) {
              results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [indicatorValue, current_portfolio];
            } else {
              const userRecord = await admin.auth().getUser(reports[i].user_id);
              userCache[reports[i].user_id] = userRecord.displayName;
              results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [indicatorValue, current_portfolio];
            }
          }
        }

        let institutionNames = [];
        Object.keys(userCache).forEach(key => institutionNames.push(userCache[key]));
        data.institution_names = institutionNames;
        data.bar_chart_results = results;
        if (place === 'todos') {
          data.table_results = tableResults(results, institutionNames, 3);
          data.indicator_labels = ['Exterior'];
          let barChart = barChartResults(results, institutionNames, ['País', 'Exterior'])
          data.color_group = 2;
          data.bar_chart_results = barChart.results;
          data.institution_names = barChart.institutionNames;
          data.line_chart_results = undefined;
        } else {
          data.table_results = tableResults(results, institutionNames, 2);
        }
        data.type = 'percentage';
        data.first_indicator_label = 'País';
        data.place = place;
        data.additional_columns = additionalColumns;
        // console.log(data.line_chart_results, data.table_results);
      }
      return res.render('select-report', data);
    } catch(error) {
      console.log('Error: ', error);
      data.error = 'No se han podido recuperar los datos de la institución. Contacte al administrador.';
      return res.render('select-report', data);
    }
  } else {
    data.error = 'Rango de años invalido. (0 <= rango <= 10)';
    return res.render('select-report', data);
  }
};

const carteraVigenteGenero = async (req, res, data) => {
  const formData = req.body;
  const sex = formData.sex;
  const years = formData.to_year - formData.from_year + 1;
  if (years >= 0 && years <= 10) {
    try {
      const reportsSnapshot = await db.collection('reports')
        .where('status', '==', 'Aceptado')
        .where('reported_year', '>=', Number(formData.from_year))
        .where('reported_year', '<=', Number(formData.to_year))
        .get();
      if (reportsSnapshot.empty) {
        console.log('No documents found.');
        data.warning = 'No hay datos reportados en el periodo seleccionado.';
      } else {
        let reports = reportsSnapshot.docs.map(doc => doc.data());
        // console.log(reports);
        let userCache = {};
        let results = [];
        for (let i = formData.from_year; i <= formData.to_year; i++) {
          let result = { reported_year: Number(i) };
          results.push(result);
        }
        const additionalColumns = [
          { name: 'Cartera Vigente', format: 'money'}
        ];

        for (let i = 0; i < reports.length; i++) {
          let current_portfolio = reports[i].current_portfolio_pregrado_male + reports[i].current_portfolio_pregrado_female
            + reports[i].current_portfolio_posgrado_male + reports[i].current_portfolio_posgrado_female;
          let female_portfolio = reports[i].current_portfolio_pregrado_female + reports[i].current_portfolio_posgrado_female;
          let male_portfolio = reports[i].current_portfolio_pregrado_male + reports[i].current_portfolio_posgrado_male;
          
          if (sex === 'todos') {
            let femaleIndicator = female_portfolio / current_portfolio * 100;
            let maleIndicator = male_portfolio / current_portfolio * 100;
            if (femaleIndicator || maleIndicator) {
              femaleIndicator = isNaN(femaleIndicator) ? 0 : femaleIndicator.toFixed(2);
              maleIndicator = isNaN(maleIndicator) ? 0 : maleIndicator.toFixed(2);
              if (userCache[reports[i].user_id]) {
                results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [femaleIndicator, maleIndicator, current_portfolio];
              } else {
                const userRecord = await admin.auth().getUser(reports[i].user_id);
                userCache[reports[i].user_id] = userRecord.displayName;
                results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [femaleIndicator, maleIndicator, current_portfolio];
              }
            }
          } else {
            let indicatorValue =  0;
            if (sex === 'femenino')
              indicatorValue = female_portfolio / current_portfolio * 100;
            else
              indicatorValue = male_portfolio / current_portfolio * 100;
            indicatorValue = isNaN(indicatorValue) ? 0 : indicatorValue.toFixed(2);
            if (userCache[reports[i].user_id]) {
              results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [indicatorValue, current_portfolio];
            } else {
              const userRecord = await admin.auth().getUser(reports[i].user_id);
              userCache[reports[i].user_id] = userRecord.displayName;
              results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [indicatorValue, current_portfolio];
            }
            
          }
        }

        let institutionNames = [];
        Object.keys(userCache).forEach(key => institutionNames.push(userCache[key]));
        data.institution_names = institutionNames;
        data.bar_chart_results = results;
        if (sex === 'todos') {
          data.table_results = tableResults(results, institutionNames, 3);
          data.indicator_labels = ['Masculino'];
          let barChart = barChartResults(results, institutionNames, ['Femenino', 'Masculino'])
          data.color_group = 2;
          data.bar_chart_results = barChart.results;
          data.institution_names = barChart.institutionNames;
          data.line_chart_results = undefined;
        } else {
          data.table_results = tableResults(results, institutionNames, 2);
        }
        data.type = 'percentage';
        data.first_indicator_label = 'Femenino';
        data.sex = sex;
        data.additional_columns = additionalColumns;
        // console.log(data.line_chart_results, data.table_results);
      }
      return res.render('select-report', data);
    } catch(error) {
      console.log('Error: ', error);
      data.error = 'No se han podido recuperar los datos de la institución. Contacte al administrador.';
      return res.render('select-report', data);
    }
  } else {
    data.error = 'Rango de años invalido. (0 <= rango <= 10)';
    return res.render('select-report', data);
  }
};

const carteraVencida = async (req, res, data) => {
  const formData = req.body;
  const years = formData.to_year - formData.from_year + 1;
  if (years >= 0 && years <= 10) {
    try {
      const reportsSnapshot = await db.collection('reports')
        .where('status', '==', 'Aceptado')
        .where('reported_year', '>=', Number(formData.from_year))
        .where('reported_year', '<=', Number(formData.to_year))
        .get();
      if (reportsSnapshot.empty) {
        console.log('No documents found.');
        data.warning = 'No hay datos reportados en el periodo seleccionado.';
      } else {
        let reports = reportsSnapshot.docs.map(doc => doc.data());
        // console.log(reports);
        let userCache = {};
        let results = [];
        for (let i = formData.from_year; i <= formData.to_year; i++) {
          let result = { reported_year: Number(i) };
          results.push(result);
        }
        const additionalColumns = [
          { name: 'Cartera Vencida', format: 'money'}
        ];

        for (let i = 0; i < reports.length; i++) {
          let total_portfolio = 0;
          let pastdue_portfolio = 0;
          if (reports[i].current_portfolio && reports[i].current_portfolio instanceof Array) {
            for (let j = 0; j < reports[i].current_portfolio.length; j++) {
              total_portfolio += Number(reports[i].current_portfolio[j].amount);
            }
          }
          if (reports[i].pastdue_portfolio && reports[i].pastdue_portfolio instanceof Array) {
            for (let j = 0; j < reports[i].pastdue_portfolio.length; j++) {
              total_portfolio += Number(reports[i].pastdue_portfolio[j].amount);
              pastdue_portfolio += Number(reports[i].pastdue_portfolio[j].amount);
            }
          }
          // if (reports[i].execution_portfolio && reports[i].execution_portfolio instanceof Array) {
          //   for (let j = 0; j < reports[i].execution_portfolio.length; j++) {
          //     total_portfolio += Number(reports[i].execution_portfolio[j].amount);
          //   }
          // }

          let indicatorValue = pastdue_portfolio / total_portfolio * 100;
          if (indicatorValue) {
            // console.log(indicatorValue);
            indicatorValue = indicatorValue.toFixed(2);
            if (userCache[reports[i].user_id]) {
              results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [indicatorValue, total_portfolio];
            } else {
              const userRecord = await admin.auth().getUser(reports[i].user_id);
              userCache[reports[i].user_id] = userRecord.displayName;
              results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [indicatorValue, total_portfolio];
            }
          }
        }

        let institutionNames = [];
        Object.keys(userCache).forEach(key => institutionNames.push(userCache[key]));

        data.line_chart_results = results;
        data.table_results = tableResults(results, institutionNames, 2);
        data.institution_names = institutionNames;
        data.type = 'percentage';
        data.additional_columns = additionalColumns;
        // console.log(data.line_chart_results, data.table_results);
      }
      return res.render('select-report', data);
    } catch(error) {
      console.log('Error: ', error);
      data.error = 'No se han podido recuperar los datos de la institución. Contacte al administrador.';
      return res.render('select-report', data);
    }
  } else {
    data.error = 'Rango de años invalido. (0 <= rango <= 10)';
    return res.render('select-report', data);
  }
};

const carteraVencidaNivel = async (req, res, data) => {
  const formData = req.body;
  const level = formData.level;
  const years = formData.to_year - formData.from_year + 1;
  if (years >= 0 && years <= 10) {
    try {
      const reportsSnapshot = await db.collection('reports')
        .where('status', '==', 'Aceptado')
        .where('reported_year', '>=', Number(formData.from_year))
        .where('reported_year', '<=', Number(formData.to_year))
        .get();
      if (reportsSnapshot.empty) {
        console.log('No documents found.');
        data.warning = 'No hay datos reportados en el periodo seleccionado.';
      } else {
        let reports = reportsSnapshot.docs.map(doc => doc.data());
        // console.log(reports);
        let userCache = {};
        let results = [];
        for (let i = formData.from_year; i <= formData.to_year; i++) {
          let result = { reported_year: Number(i) };
          results.push(result);
        }
        const additionalColumns = [
          { name: 'Cartera Vigente', format: 'money' }
        ];

        for (let i = 0; i < reports.length; i++) {
          let pastdue_portfolio = 0;
          let level_portfolio = 0;
          let pregrado_portfolio = 0;
          let posgrado_portfolio = 0;
          if (reports[i].pastdue_portfolio && reports[i].pastdue_portfolio instanceof Array) {
            for (let j = 0; j < reports[i].pastdue_portfolio.length; j++) {
              pastdue_portfolio += Number(reports[i].pastdue_portfolio[j].amount);
              if (reports[i].pastdue_portfolio[j].name === level + '_pais'
                || reports[i].pastdue_portfolio[j].name === level + '_exterior') {
                level_portfolio += Number(reports[i].pastdue_portfolio[j].amount);
              } else {
                if (reports[i].pastdue_portfolio[j].name === 'pregrado_pais'
                  || reports[i].pastdue_portfolio[j].name === 'pregrado_exterior') {
                  pregrado_portfolio += Number(reports[i].pastdue_portfolio[j].amount);
                } else if (reports[i].pastdue_portfolio[j].name === 'posgrado_pais'
                  || reports[i].pastdue_portfolio[j].name === 'posgrado_exterior') {
                  posgrado_portfolio += Number(reports[i].pastdue_portfolio[j].amount);
                }
              }
            }
          }

          if (level === 'todos') {
            let pregradoIndicator = pregrado_portfolio / pastdue_portfolio * 100;
            let posgradoIndicator = posgrado_portfolio / pastdue_portfolio * 100;
            if (pregradoIndicator || posgradoIndicator) {
              pregradoIndicator = isNaN(pregradoIndicator) ? 0 : pregradoIndicator.toFixed(2);
              posgradoIndicator = isNaN(posgradoIndicator) ? 0 : posgradoIndicator.toFixed(2);
              if (userCache[reports[i].user_id]) {
                results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [pregradoIndicator, posgradoIndicator, pastdue_portfolio];
              } else {
                const userRecord = await admin.auth().getUser(reports[i].user_id);
                userCache[reports[i].user_id] = userRecord.displayName;
                results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [pregradoIndicator, posgradoIndicator, pastdue_portfolio];
              }
            }
          } else {
            let indicatorValue = level_portfolio / pastdue_portfolio * 100;
            indicatorValue = isNaN(indicatorValue) ? 0 : indicatorValue.toFixed(2);
            // console.log(indicatorValue);
            indicatorValue = indicatorValue.toFixed(2);
            if (userCache[reports[i].user_id]) {
              results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [indicatorValue, pastdue_portfolio];
            } else {
              const userRecord = await admin.auth().getUser(reports[i].user_id);
              userCache[reports[i].user_id] = userRecord.displayName;
              results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [indicatorValue, pastdue_portfolio];
            }
          }
        }

        let institutionNames = [];
        Object.keys(userCache).forEach(key => institutionNames.push(userCache[key]));
        data.institution_names = institutionNames;
        data.bar_chart_results = results;
        if (level === 'todos') {
          data.table_results = tableResults(results, institutionNames, 3);
          data.indicator_labels = ['Posgrado'];
          let barChart = barChartResults(results, institutionNames, ['Pregrado', 'Posgrado'])
          data.color_group = 2;
          data.bar_chart_results = barChart.results;
          data.institution_names = barChart.institutionNames;
          data.line_chart_results = undefined;
        } else {
          data.table_results = tableResults(results, institutionNames, 2);
        }
        data.type = 'percentage';
        data.first_indicator_label = 'Pregrado';
        data.level = level;
        data.additional_columns = additionalColumns;
        // console.log(data.line_chart_results, data.table_results);
      }
      return res.render('select-report', data);
    } catch(error) {
      console.log('Error: ', error);
      data.error = 'No se han podido recuperar los datos de la institución. Contacte al administrador.';
      return res.render('select-report', data);
    }
  } else {
    data.error = 'Rango de años invalido. (0 <= rango <= 10)';
    return res.render('select-report', data);
  }
};

const carteraVencidaLugar = async (req, res, data) => {
  const formData = req.body;
  const place = formData.place;
  const years = formData.to_year - formData.from_year + 1;
  if (years >= 0 && years <= 10) {
    try {
      const reportsSnapshot = await db.collection('reports')
        .where('status', '==', 'Aceptado')
        .where('reported_year', '>=', Number(formData.from_year))
        .where('reported_year', '<=', Number(formData.to_year))
        .get();
      if (reportsSnapshot.empty) {
        console.log('No documents found.');
        data.warning = 'No hay datos reportados en el periodo seleccionado.';
      } else {
        let reports = reportsSnapshot.docs.map(doc => doc.data());
        // console.log(reports);
        let userCache = {};
        let results = [];
        for (let i = formData.from_year; i <= formData.to_year; i++) {
          let result = { reported_year: Number(i) };
          results.push(result);
        }
        const additionalColumns = [
          { name: 'Cartera Vigente', format: 'money'}
        ];

        for (let i = 0; i < reports.length; i++) {
          let pastdue_portfolio = 0;
          let place_portfolio = 0;
          let pais_portfolio = 0;
          let exterior_portfolio = 0;
          if (reports[i].pastdue_portfolio && reports[i].pastdue_portfolio instanceof Array) {
            for (let j = 0; j < reports[i].pastdue_portfolio.length; j++) {
              pastdue_portfolio += Number(reports[i].pastdue_portfolio[j].amount);
              if (reports[i].pastdue_portfolio[j].name === 'pregrado_' + place
                || reports[i].pastdue_portfolio[j].name === 'posgrado_' + place) {
                place_portfolio += Number(reports[i].pastdue_portfolio[j].amount);
              } else {
                if (reports[i].pastdue_portfolio[j].name === 'pregrado_pais'
                  || reports[i].pastdue_portfolio[j].name === 'posgrado_pais') {
                  pais_portfolio += Number(reports[i].pastdue_portfolio[j].amount);
                } else if (reports[i].pastdue_portfolio[j].name === 'pregrado_exterior'
                  || reports[i].pastdue_portfolio[j].name === 'posgrado_exterior') {
                  exterior_portfolio += Number(reports[i].pastdue_portfolio[j].amount);
                }
              }
            }
          }

          if (place === 'todos') {
            let paisIndicator = pais_portfolio / pastdue_portfolio * 100;
            let exteriorIndicator = exterior_portfolio / pastdue_portfolio * 100;
            if (paisIndicator || exteriorIndicator) {
              paisIndicator = isNaN(paisIndicator) ? 0 : paisIndicator.toFixed(2);
              exteriorIndicator = isNaN(exteriorIndicator) ? 0 : exteriorIndicator.toFixed(2);
              if (userCache[reports[i].user_id]) {
                results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [paisIndicator, exteriorIndicator, pastdue_portfolio];
              } else {
                const userRecord = await admin.auth().getUser(reports[i].user_id);
                userCache[reports[i].user_id] = userRecord.displayName;
                results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [paisIndicator, exteriorIndicator, pastdue_portfolio];
              }
            }
          } else {
            let indicatorValue = place_portfolio / pastdue_portfolio * 100;
            indicatorValue = isNaN(indicatorValue) ? 0 : indicatorValue.toFixed(2);
            if (userCache[reports[i].user_id]) {
              results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [indicatorValue, pastdue_portfolio];
            } else {
              const userRecord = await admin.auth().getUser(reports[i].user_id);
              userCache[reports[i].user_id] = userRecord.displayName;
              results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [indicatorValue, pastdue_portfolio];
            }
          }
        }

        let institutionNames = [];
        Object.keys(userCache).forEach(key => institutionNames.push(userCache[key]));
        data.institution_names = institutionNames;
        data.bar_chart_results = results;
        if (place === 'todos') {
          data.table_results = tableResults(results, institutionNames, 3);
          data.indicator_labels = ['Exterior'];
          let barChart = barChartResults(results, institutionNames, ['País', 'Exterior'])
          data.color_group = 2;
          data.bar_chart_results = barChart.results;
          data.institution_names = barChart.institutionNames;
          data.line_chart_results = undefined;
        } else {
          data.table_results = tableResults(results, institutionNames, 2);
        }
        data.type = 'percentage';
        data.first_indicator_label = 'País';
        data.place = place;
        data.additional_columns = additionalColumns;
        // console.log(data.line_chart_results, data.table_results);
      }
      return res.render('select-report', data);
    } catch(error) {
      console.log('Error: ', error);
      data.error = 'No se han podido recuperar los datos de la institución. Contacte al administrador.';
      return res.render('select-report', data);
    }
  } else {
    data.error = 'Rango de años invalido. (0 <= rango <= 10)';
    return res.render('select-report', data);
  }
};

const carteraVencidaGenero = async (req, res, data) => {
  const formData = req.body;
  const sex = formData.sex;
  const years = formData.to_year - formData.from_year + 1;
  if (years >= 0 && years <= 10) {
    try {
      const reportsSnapshot = await db.collection('reports')
        .where('status', '==', 'Aceptado')
        .where('reported_year', '>=', Number(formData.from_year))
        .where('reported_year', '<=', Number(formData.to_year))
        .get();
      if (reportsSnapshot.empty) {
        console.log('No documents found.');
        data.warning = 'No hay datos reportados en el periodo seleccionado.';
      } else {
        let reports = reportsSnapshot.docs.map(doc => doc.data());
        // console.log(reports);
        let userCache = {};
        let results = [];
        for (let i = formData.from_year; i <= formData.to_year; i++) {
          let result = { reported_year: Number(i) };
          results.push(result);
        }
        const additionalColumns = [
          { name: 'Cartera Vigente', format: 'money'}
        ];

        for (let i = 0; i < reports.length; i++) {
          let pastdue_portfolio = reports[i].pastdue_portfolio_pregrado_male + reports[i].pastdue_portfolio_pregrado_female
            + reports[i].pastdue_portfolio_posgrado_male + reports[i].pastdue_portfolio_posgrado_female;
          let female_portfolio = reports[i].pastdue_portfolio_pregrado_female + reports[i].pastdue_portfolio_posgrado_female;
          let male_portfolio = reports[i].pastdue_portfolio_pregrado_male + reports[i].pastdue_portfolio_posgrado_male;

          if (sex === 'todos') {
            let femaleIndicator = female_portfolio / pastdue_portfolio * 100;
            let maleIndicator = male_portfolio / pastdue_portfolio * 100;
            if (!isNaN(femaleIndicator) || !isNaN(maleIndicator)) {
              femaleIndicator = isNaN(femaleIndicator) ? 0 : femaleIndicator.toFixed(2);
              maleIndicator = isNaN(maleIndicator) ? 0 : maleIndicator.toFixed(2);
              if (userCache[reports[i].user_id]) {
                results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [femaleIndicator, maleIndicator, pastdue_portfolio];
              } else {
                const userRecord = await admin.auth().getUser(reports[i].user_id);
                userCache[reports[i].user_id] = userRecord.displayName;
                results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [femaleIndicator, maleIndicator, pastdue_portfolio];
              }
            }
          } else {
            let indicatorValue;
            if (sex === 'femenino')
              indicatorValue = female_portfolio / pastdue_portfolio * 100;
            else
              indicatorValue = male_portfolio / pastdue_portfolio * 100;
            indicatorValue = isNaN(indicatorValue) ? 0 : indicatorValue.toFixed(2);
            if (userCache[reports[i].user_id]) {
              results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [indicatorValue, pastdue_portfolio];
            } else {
              const userRecord = await admin.auth().getUser(reports[i].user_id);
              userCache[reports[i].user_id] = userRecord.displayName;
              results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [indicatorValue, pastdue_portfolio];
            }
          }
        }

        let institutionNames = [];
        Object.keys(userCache).forEach(key => institutionNames.push(userCache[key]));
        data.institution_names = institutionNames;
        data.bar_chart_results = results;
        if (sex === 'todos') {
          data.table_results = tableResults(results, institutionNames, 3);
          data.indicator_labels = ['Masculino'];
          let barChart = barChartResults(results, institutionNames, ['Femenino', 'Masculino'])
          data.color_group = 2;
          data.bar_chart_results = barChart.results;
          data.institution_names = barChart.institutionNames;
          data.line_chart_results = undefined;
        } else {
          data.table_results = tableResults(results, institutionNames, 2);
        }
        data.type = 'percentage';
        data.first_indicator_label = 'Femenino';
        data.sex = sex;
        data.additional_columns = additionalColumns;
        // console.log(data.line_chart_results, data.table_results);
      }
      return res.render('select-report', data);
    } catch(error) {
      console.log('Error: ', error);
      data.error = 'No se han podido recuperar los datos de la institución. Contacte al administrador.';
      return res.render('select-report', data);
    }
  } else {
    data.error = 'Rango de años invalido. (0 <= rango <= 10)';
    return res.render('select-report', data);
  }
};

const empleadoBeneficiario = async (req, res, data) => {
  const formData = req.body;
  const years = formData.to_year - formData.from_year + 1;
  if (years >= 0 && years <= 10) {
    try {
      const reportsSnapshot = await db.collection('reports')
        .where('status', '==', 'Aceptado')
        .where('reported_year', '>=', Number(formData.from_year))
        .where('reported_year', '<=', Number(formData.to_year))
        .get();
      if (reportsSnapshot.empty) {
        console.log('No documents found.');
        data.warning = 'No hay datos reportados en el periodo seleccionado.';
      } else {
        let reports = reportsSnapshot.docs.map(doc => doc.data());
        // console.log(reports);
        let userCache = {};
        let employeesCache = {};
        let results = [];
        for (let i = formData.from_year; i <= formData.to_year; i++) {
          let result = { reported_year: Number(i) };
          results.push(result);
        }
        const additionalColumns = [
          { name: 'Total Beneficiarios', format: 'number'},
          { name: 'Total Empleados', format: 'number'}
        ];

        for (let i = 0; i < reports.length; i++) {
          let total_students = 0;
          let total_employees = 0;
          if (employeesCache[reports[i].user_id]) {
            total_employees = employeesCache[reports[i].user_id];
          } else {
            const usersSnapshot = await db.collection('users')
              .where('user_id', '==', reports[i].user_id)
              .get();
            try {
              if (usersSnapshot.size > 1) {
                console.log('Error: ', 'Duplicate user profile document');
                data.error = 'Error de información duplicada. Contacte al administrador';
              } else {
                const institution = usersSnapshot.docs[0].data();
                userCache[reports[i].user_id] = institution.name;
                employeesCache[reports[i].user_id] = Number(institution.employees);
                total_employees = Number(institution.employees);
              }
            } catch (error) {
              console.log("Error: ", error);
              data.error = "Error al consultar datos del usuario";
            }
          }
          if (reports[i].programs && reports[i].programs instanceof Array) {
            for (let j = 0; j < reports[i].programs.length; j++) {
              const program = reports[i].programs[j];
              if (program.beneficiaries)
                total_students += Number(program.beneficiaries);
            }
          }

          let indicatorValue = total_students / total_employees;
          if (indicatorValue) {
            // console.log(indicatorValue);
            indicatorValue = indicatorValue.toFixed(2);
            if (userCache[reports[i].user_id]) {
              results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [indicatorValue, total_students, total_employees];
            } else {
              const userRecord = await admin.auth().getUser(reports[i].user_id);
              userCache[reports[i].user_id] = userRecord.displayName;
              results[reports[i].reported_year - formData.from_year][userCache[reports[i].user_id]] = [indicatorValue, total_students, total_employees];
            }
          }
        }

        let institutionNames = [];
        Object.keys(userCache).forEach(key => institutionNames.push(userCache[key]));

        data.line_chart_results = results;
        data.table_results = tableResults(results, institutionNames, 3);
        data.institution_names = institutionNames;
        data.type = 'number';
        data.additional_columns = additionalColumns;
        // console.log(data.line_chart_results, data.table_results);
      }
      return res.render('select-report', data);
    } catch(error) {
      console.log('Error: ', error);
      data.error = 'No se han podido recuperar los datos de la institución. Contacte al administrador.';
      return res.render('select-report', data);
    }
  } else {
    data.error = 'Rango de años invalido. (0 <= rango <= 10)';
    return res.render('select-report', data);
  }
};

const plataformaTecnologica = async (req, res, data) => {
  const formData = req.body;
  const years = formData.to_year - formData.from_year + 1;
  if (years >= 0 && years <= 10) {
    try {
      const usersSnapshot = await db.collection('users')
        .get();
      if (usersSnapshot.empty) {
        console.log('No documents found.');
        data.warning = 'No hay datos reportados en el periodo seleccionado.';
      } else {
        let users = usersSnapshot.docs.map(doc => doc.data());
        // console.log(reports);
        let results = [];
        let pie_chart_results = { "Sí" :0, "No": 0 };
        for (let i = 0; i < users.length; i++) {
          if (users[i].name && users[i].has_platform) {
            pie_chart_results[users[i].has_platform.toLowerCase() == 'si' ? "Sí": "No"]++;
            let result = {
              institution_name: users[i].name,
              indicators: [{reported_year: '¿Cuenta con Plataforma Tecnológica?', values: [users[i].has_platform]}]
            };
            results.push(result);
          }
        }
        data.pie_chart_results = Object.keys(pie_chart_results).reduce((acc, key) => {
          acc.push({ label: key, value: pie_chart_results[key]});
          return acc;
        },[]);
        data.table_results = results;
        // data.institution_names = ['si', 'no'];
        // data.type = 'percentage';
        // console.log(data.line_chart_results, data.table_results);
      }
      return res.render('select-report', data);
    } catch(error) {
      console.log('Error: ', error);
      data.error = 'No se han podido recuperar los datos de la institución. Contacte al administrador.';
      return res.render('select-report', data);
    }
  } else {
    data.error = 'Rango de años invalido. (0 <= rango <= 10)';
    return res.render('select-report', data);
  }
};

const regulacion = async (req, res, data) => {
  const formData = req.body;
  const years = formData.to_year - formData.from_year + 1;
  if (years >= 0 && years <= 10) {
    try {
      const usersSnapshot = await db.collection('users')
        .get();
      if (usersSnapshot.empty) {
        console.log('No documents found.');
        data.warning = 'No hay datos reportados en el periodo seleccionado.';
      } else {
        let users = usersSnapshot.docs.map(doc => doc.data());
        // console.log(reports);
        let results = [];
        let pie_chart_results = { "Sí" :0, "No": 0 };
        for (let i = 0; i < users.length; i++) {
          if (users[i].name && users[i].regulated) {
            pie_chart_results[users[i].regulated.toLowerCase() == 'si' ? "Sí": "No"]++;
            let result = {
              institution_name: users[i].name,
              indicators: [{reported_year: '¿Está la ICE regulada?', values: [users[i].regulated, users[i].regulating_entity]}]
            };
            results.push(result);
          }
        }
        const additionalColumns = [
          { name: 'Entidad Reguladora', format: 'text'}
        ];

        data.pie_chart_results = Object.keys(pie_chart_results).reduce((acc, key) => {
          acc.push({ label: key, value: pie_chart_results[key]});
          return acc;
        },[]);
        data.table_results = results;
        // data.institution_names = ['si', 'no'];
        // data.type = 'percentage';
        data.additional_columns = additionalColumns;
        // console.log(data.line_chart_results, data.table_results);
      }
      return res.render('select-report', data);
    } catch(error) {
      console.log('Error: ', error);
      data.error = 'No se han podido recuperar los datos de la institución. Contacte al administrador.';
      return res.render('select-report', data);
    }
  } else {
    data.error = 'Rango de años invalido. (0 <= rango <= 10)';
    return res.render('select-report', data);
  }
};

const calificacion = async (req, res, data) => {
  const formData = req.body;
  const years = formData.to_year - formData.from_year + 1;
  if (years >= 0 && years <= 10) {
    try {
      const usersSnapshot = await db.collection('users')
        .get();
      if (usersSnapshot.empty) {
        console.log('No documents found.');
        data.warning = 'No hay datos reportados en el periodo seleccionado.';
      } else {
        let users = usersSnapshot.docs.map(doc => doc.data());
        // console.log(reports);
        let results = [];
        let pie_chart_results = { "Sí" :0, "No": 0 };
        for (let i = 0; i < users.length; i++) {
          if (users[i].name && users[i].credit_rating) {
            pie_chart_results[users[i].credit_rating.toLowerCase() == 'si' ? "Sí": "No"]++;
            let result = {
              institution_name: users[i].name,
              indicators: [{reported_year: '¿Cuenta la ICE con calificación crediticia?',
                values: [users[i].credit_rating, users[i].rating_agency]}]
            };
            results.push(result);
          }
        }
        const additionalColumns = [
          { name: 'Agencia Calificadora', format: 'text'}
        ];

        data.pie_chart_results = Object.keys(pie_chart_results).reduce((acc, key) => {
          acc.push({ label: key, value: pie_chart_results[key]});
          return acc;
        },[]);
        data.table_results = results;
        // data.institution_names = ['si', 'no'];
        // data.type = 'percentage';
        data.additional_columns = additionalColumns;
        // console.log(data.line_chart_results, data.table_results);
      }
      return res.render('select-report', data);
    } catch(error) {
      console.log('Error: ', error);
      data.error = 'No se han podido recuperar los datos de la institución. Contacte al administrador.';
      return res.render('select-report', data);
    }
  } else {
    data.error = 'Rango de años invalido. (0 <= rango <= 10)';
    return res.render('select-report', data);
  }
};

const tableResults = (chartResults, institutionNames, indicatorsLength) => {
  let tableResults = [];
  for (let i = 0; i < institutionNames.length; i++) {
    let result = { institution_name: institutionNames[i], indicators: [] };
    for (let j = 0; j < chartResults.length; j++) {
      let indicator = { reported_year: chartResults[j].reported_year };
      const indicatorValues = chartResults[j][result.institution_name];
      indicator.values = [];
      for (let k = 0; k < indicatorsLength; k++) {
        indicator.values.push(null);
      }
      if (indicatorValues) {
        indicator.values = indicatorValues;
      }
      // console.log(indicator);
      result.indicators.push(indicator);
    }
    tableResults.push(result);
  }
  return tableResults;
};

const barChartResults = (chartResults, institutionNames, indicatorsNames) => {
  let barChartResults = chartResults.map(result => {
    let resultMap = { reported_year: result.reported_year };
    for (let institutionName of institutionNames) {
      let indicators = result[institutionName];
      if (indicators) {
        indicatorsNames.forEach((indicatorName, i) => {
          let institutionNameP = institutionName + ' ' + indicatorName
          resultMap[institutionNameP] = parseFloat(indicators[i]);
        });
      }
    }
    return resultMap;
  })
  let institutionNamesFinal = institutionNames.reduce((acc, institutionName) => {
    acc.push(...indicatorsNames.map(name => institutionName + ' ' + name));
    return acc
  }, []);
  return { results: barChartResults, institutionNames: institutionNamesFinal };
};

const getFinancingSource = (code) => {
  console.log('data source',code);
  switch (code) {
    case 'gubernamental': {
      return 'Recursos Gubernamentales';
    }
    case 'privado': {
      return 'Recursos Privados';
    }
    case 'nacional': {
      return 'Créditos Nacionales';
    }
    case 'internacional': {
      return 'Créditos Internacionales';
    }
    case 'donaciones': {
      return 'Donaciones y Filantropía';
    }
    case 'cartera': {
      return 'Recuperación de la Cartera / Cobranza';
    }
    case 'terceros': {
      return 'Administración de Recursos de terceros';
    }
    case 'cooperacion': {
      return 'Fondos de Cooperación';
    }
    case 'impuestos': {
      return 'Impuestos, Tasas y Contribuciones';
    }
    case 'titularizacion': {
      return 'Titularización';
    }
    case 'propios': {
      return 'Recursos Propios';
    }
    case 'inversiones': {
      return 'Inversiones';
    }
    case 'otra': {
      return 'Otra';
    }
    case 'todos': {
      return 'Total';
    }
    default: {
      if(!code) { 
        return 'Error';
      }
      const lower = code.toLowerCase();
      return code.charAt(0).toUpperCase() + lower.slice(1);
    }
  }
};