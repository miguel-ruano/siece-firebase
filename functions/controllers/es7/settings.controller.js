const admin = require('firebase-admin');
const db = admin.firestore();

exports.getSettings = async (req, res, predata) => {
  let data = predata || { user: req.user, is_admin: req.is_admin};
  try {
    const settings = await db.collection('settings').get();
    data.current_year = new Date().getUTCFullYear();
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth()+1;
    var yyyy = today.getFullYear();
    if(dd<10){
        dd='0'+dd
    } 
    if(mm<10){
        mm='0'+mm
    } 
    data.current_date = yyyy+'-'+mm+'-'+dd;
    data.min_year = settings.docs[0].data().min_year && !isNaN(parseInt(settings.docs[0].data().min_year)) ? parseInt(settings.docs[0].data().min_year) : 1000;
    data.max_year = settings.docs[0].data().max_year && !isNaN(parseInt(settings.docs[0].data().max_year)) ? parseInt(settings.docs[0].data().max_year) : data.current_year;
    data.from_visualize = settings.docs[0].data().from_visualize;
    data.to_visualize = settings.docs[0].data().to_visualize;
    data.from_report = settings.docs[0].data().from_report;
    data.to_report = settings.docs[0].data().to_report;
    return res.render('settings', data);
  } catch (error) {
    data.error = 'Error al consultar la base de datos.';
    return res.render('settings', data);
  }
};

exports.updateSettings = async (req, res) => {
    const settingsDB = await db.collection('settings').get();
    let data = { user: req.user, is_admin: req.is_admin };
    data.current_year = new Date().getUTCFullYear();
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth()+1;
    var yyyy = today.getFullYear();
    if(dd<10){
        dd='0'+dd
    } 
    if(mm<10){
        mm='0'+mm
    } 
    data.current_date = yyyy+'-'+mm+'-'+dd;
    try {
        const formData = req.body;
        if (formData.from_year > formData.to_year || formData.from_visualize > formData.to_visualize || formData.from_report > formData.to_report){
            data.min_year = formData.from_year;
            data.max_year = formData.to_year;
            data.from_visualize = formData.from_visualize;
            data.to_visualize = formData.to_visualize;
            data.from_report = formData.from_report;
            data.to_report = formData.to_report;
            data.error = 'Las fechas de la izquierda deben ser menores o iguales a las de la derecha'
            return res.render('settings', data);
        }
        const updatedSettings = { 
            min_year: formData.from_year,
            max_year: formData.to_year,
            from_visualize: formData.from_visualize,
            to_visualize: formData.to_visualize,
            from_report: formData.from_report,
            to_report: formData.to_report
        };
        result = await settingsDB.docs[0].ref.set(updatedSettings);
        const nowSettings = await db.collection('settings').get();
        data.min_year = nowSettings.docs[0].data().min_year;
        data.max_year = nowSettings.docs[0].data().max_year;
        data.from_visualize = nowSettings.docs[0].data().from_visualize;
        data.to_visualize = nowSettings.docs[0].data().to_visualize;
        data.from_report = nowSettings.docs[0].data().from_report;
        data.to_report = nowSettings.docs[0].data().to_report;
        data.success = 'Datos guardados exitosamente';
        return res.render('settings', data);
    } catch (error) {
        console.log('Error: ', error);
        data.error = 'Error al consultar la base de datos. Contacte al administrador';
        return res.render('settings', data);
    }
}
