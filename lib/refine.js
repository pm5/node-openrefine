'use strict'

var superagent = require('superagent')
var fs = require('fs')
var debug = require('debug')('open-refine')

module.exports = function () {
  var refine = {}
  var opts = {
    base_url: 'http://localhost:3333'
  }

  refine.create_project = function (project_name, file_name, done) {
    debug(file_name)
    superagent
      .post(opts.base_url + '/command/core/create-project-from-upload')
      .redirects(0)
      .field('project-name', project_name)
      .attach('project-file', fs.readFileSync(file_name))
      .end(function (err, res) {
        if (res.status === 302) {
          done(null, res.headers.location.replace('http://localhost:3333/project?project=', ''))
        } else {
          done(err)
        }
      })
  }

  refine.apply_operations = function (project_id, file_name, done) {
    superagent
      .post(opts.base_url + '/command/core/apply-operations')
      .field('project', project_id)
      .attach('operations', fs.readFileSync(file_name))
      .end(function (err, res) {
        done(err)
        done(res)
      })
  }

  refine.delete_project = function (project_id, done) {
    debug(project_id)
    superagent
      .post(opts.base_url + '/command/core/delete-project')
      .field('project', project_id)
      .end(function (err, res) {
        if (err !== null) {
          done(err)
        } else if (res.body.code === 'error') {
          done(res.body)
        }
      })
  }

  return refine
}
