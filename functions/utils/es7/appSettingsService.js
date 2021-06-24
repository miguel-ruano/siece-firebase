'use strict';

const admin = require('firebase-admin');
const db = admin.firestore();

exports.getAvailableYears = async () => {
    let availableYears = []
    try {
        var settings = await db.collection('settings').get();
        settings = settings.empty ? null : settings.docs[0].data();
        const min_year = parseInt(settings.min_year);
        const max_year = parseInt(settings.max_year);
        for (let i=min_year; i<=max_year; i++){
            availableYears.push(i.toString());
        }
    } catch (error) {
        console.log(error);
    }
    return availableYears;
} 

exports.canVisualize = async () => {
    let able = false
    try {
        var settings = await db.collection('settings').get();
        settings = settings.empty ? null : settings.docs[0].data();
        const from_visualize = Date.parse(settings.from_visualize);
        const to_visualize = Date.parse(settings.to_visualize);
        const today = new Date();
        able = from_visualize < today && to_visualize > today;
    } catch (error) {
        console.log(error);
    }
    return able;
} 

exports.canReport = async () => {
    let able = false
    try {
        var settings = await db.collection('settings').get();
        settings = settings.empty ? null : settings.docs[0].data();
        const from_report = Date.parse(settings.from_report);
        const to_report = Date.parse(settings.to_report);
        const today = new Date();
        able = from_report < today && to_report > today;
    } catch (error) {
        console.log(error);
    }
    return able;
} 
