
var expect = require('chai').expect
var OpenRefine = require('../').OpenRefine

describe('OpenRefine API', function () {
  it('can get projects metadata', done => {
    var server = OpenRefine()
    server.projects_metadata()
      .then(data => {
        if (!data.projects) {
          return done('Incorrect data')
        }
        Object.keys(data.projects).forEach(function (id) {
          if (!data.projects[id].name ||
              !data.projects[id].created ||
              !data.projects[id].modified) {
            return done('incorrect data in project ' + id + '.')
          }
        })
        done()
      })
      .catch(done)
  })

  it('can create project by uploading data', done => {
    var server = OpenRefine()
    server.project('my_awesome_data_cleanup_project')
      .upload('test/test.csv')
      .then(result => {
        if (!result.project_id) {
          return done('no project ID returned.')
        }
        if (typeof result.project_id !== 'number') {
          return done('project ID ' + result.project_id + ' is not a number.')
        }
        done()
      })
      .catch(done)
  })
})
