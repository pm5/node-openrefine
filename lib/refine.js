'use strict'

var superagent = require('superagent')
var fs = require('fs')
var debug = require('debug')('open-refine')

module.exports = function () {
  var refine = {}
  var conf = {
    base_url: 'http://localhost:3333'
  }

  refine.create_project = function (project_name, file_name, done) {
    debug(file_name)
    superagent
      .post(conf.base_url + '/command/core/create-project-from-upload?options={"encoding":"UTF-8","separator":",","ignoreLines":-1,"headerLines":1,"skipDataLines":0,"limit":-1,"storeBlankRows":true,"guessCellValueTypes":false,"processQuotes":true,"storeBlankCellsAsNulls":true,"includeFileSources":false}')
      .redirects(0)
      .field('project-name', project_name)
      .field('encoding', 'UTF-8')
      .attach('project-file', fs.readFileSync(file_name), file_name)
      .end(function (err, res) {
        if (res.status === 302) {
          done(null, res.headers.location.replace('http://localhost:3333/project?project=', ''))
        } else {
          done(err)
        }
      })
  }

  refine.apply_operations = function (project_id, file_name, done) {
    debug(fs.readFileSync(file_name).toString())
    superagent
      .post(conf.base_url + '/command/core/apply-operations?project=' + project_id)
      .send('operations=' + fs.readFileSync(file_name))
      .end(function (err, res) {
        done(err)
      })
  }

  refine.delete_project = function (project_id, done) {
    debug(project_id)
    superagent
      .post(conf.base_url + '/command/core/delete-project')
      .send('project=' + project_id)
      .end(function (err, res) {
        if (err !== null) {
          done(err)
        } else if (res.body.code === 'error') {
          done(res.body)
        }
      })
  }

  refine.export_rows = function (project_id, opts, done) {
    opts = opts || {}
    var format = opts['format'] || 'csv'
    superagent
      .post(conf.base_url + '/command/core/export-rows/' + project_id + '.' + format)
      .send('engine={"facets":[],"mode":"row-based"}')
      .send('project=' + project_id)
      .send('format=' + format)
      .end(function (err, res) {
        done(err, res.text)
      })
  }

  refine.get_all_project_metadata = function (done) {
    superagent
      .get(conf.base_url + '/command/core/get-all-project-metadata')
      .end(function (err, res) {
        if (err) {
          return done(err, res)
        }
        return done(null, res.body)
      })
  }

  return refine
}
