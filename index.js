'use strict'

//module.exports = require('lib/refine')
var refine = require('./lib/refine')()
var debug = require('debug')('open-refine')

refine.create_project('testtest', 'test.json', function (err, project_id) {
  if (err !== null) {
    return debug(err)
  }

  refine.apply_operations(project_id, 'cleanup.json', debug)

  refine.delete_project(project_id, debug)
})
