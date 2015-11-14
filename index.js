'use strict'

//module.exports = require('lib/refine')
var refine = require('./lib/refine')()
var debug = require('debug')('open-refine')

//refine.create_project('testcsv', 'test.csv', function (err, project_id) {
  //if (err !== null) {
    //return debug(err)
  //}
  //debug(project_id)
  //refine.apply_operations(project_id, 'op.json', function (err) {
    //refine.export_rows(project_id, null, function (err, content) {
      //console.log(content)
      //refine.delete_project(project_id, debug)
    //})
  //})

//})

//refine.get_all_project_metadata(function (err, data) {
  //if (err) {
    //return debug(err)
  //}
  //Object.keys(data.projects).filter(function (id) {
    //return data.projects[id].name === 'testtest'
  //}).forEach(function (id) {
    //refine.delete_project(id, debug)
  //})
  //setTimeout(function () {
    //debug('done!')
  //}, 5000)
//})
