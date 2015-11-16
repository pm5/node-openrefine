
var expect = require('chai').expect
var OpenRefine = require('../').OpenRefine

describe('OpenRefine API', function () {

  describe('Server', () => {
    it('can get projects metadata', done => {
      OpenRefine()
        .projects_metadata()
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

    it('can delete projects', done => {
      var server = OpenRefine()
      server
        .project('my_awesome_data_cleanup_project')
        .upload('test/test.csv')
        .then(r => server.delete(r.project_id))
        .then(() => done())
        .catch(done)
    })
  })

  describe('Project', () => {
    it('can create project by uploading data', done => {
      OpenRefine()
        .project('my_awesome_data_cleanup_project')
        .upload('test/test.csv')
        .then(r => {
          if (!r.project_id) {
            return done('no project ID returned.')
          }
          if (typeof r.project_id !== 'number' || r.project_id <= 0) {
            return done('invalid project ID ' + r.project_id + '.')
          }
          done()
        })
        .catch(done)
    })

    it('can apply operations to project', done => {
      OpenRefine()
        .project('my_awesome_data_cleanup_project')
        .upload('test/test.csv')
        .apply('test/op.json')
        .then(() => done())
        .catch(done)
    })

    it('can download data from project', done => {
      OpenRefine()
        .project('my_awesome_data_cleanup_project')
        .upload('test/test.csv')
        .apply('test/op.json')
        .download('csv', 'output.csv')
        .then(() => done())
        .catch(done)
    })

    it('can delete projects', done => {
      OpenRefine()
        .project('my_awesome_data_cleanup_project')
        .upload('test/test.csv')
        .delete()
        .then(() => done())
        .catch(done)
    })
  })
})
