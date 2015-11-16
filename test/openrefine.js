'use strict'

var expect = require('chai').expect
var OpenRefine = require('../').OpenRefine

describe('OpenRefine', () => {
  var test_project_name = 'my_awesome_data_cleanup_project_dont_use_this_name_for_your_projects'

  describe('Server', () => {
    describe('get projects metadata', () => {
      var projects_data
      before(() =>
        OpenRefine()
          .projects_metadata()
          .then(data => projects_data = data)
      )

      it('should have correct format', () => {
        expect(projects_data.projects).to.be.defined
        Object.keys(projects_data.projects).forEach(id => {
          expect(projects_data.projects[id].name).to.be.defined
          expect(projects_data.projects[id].created).to.be.defined
          expect(projects_data.projects[id].modified).to.be.defined
        })
      })
    })

    describe('delete projects', () => {
      var id
      before(() =>
        OpenRefine()
          .project(test_project_name)
          .upload('test/test.csv')
          .then(r => id = r.project_id)
      )
      after(() => OpenRefine().delete(id))

      it('should delete projects', () =>
        OpenRefine()
          .delete(id)
          .then(() => OpenRefine().projects_metadata())
          .then(data => {
            expect(data).to.not.have.property(id)
          })
      )
    })
  })

  describe('Project', () => {
    after(() =>
      OpenRefine()
        .projects_metadata()
        .then(data =>
          Object.keys(data.projects)
            .filter(id => data.projects[id].name === test_project_name)
        )
        .then(ids => ids.forEach(OpenRefine().delete))
    )

    describe('upload data', () => {
      it('should create project by uploading data', () =>
        OpenRefine()
          .project(test_project_name)
          .upload('test/test.csv')
          .then(r => {
            expect(r.project_id).to.be.defined
            expect(r.project_id).to.be.a('number')
            expect(r.project_id).to.be.gte(0)
          })
      )
    })

    describe('apply operations', () => {
      it('should apply operations to project', () =>
        OpenRefine()
          .project(test_project_name)
          .upload('test/test.csv')
          .apply('test/op.json')
      )
    })

    describe('download data', () => {
      it('should download data from project', () =>
        OpenRefine()
          .project(test_project_name)
          .upload('test/test.csv')
          .apply('test/op.json')
          .download('csv', 'output.csv')
      )
    })

    describe('delete project', () => {
      it('should delete projects', () =>
        OpenRefine()
          .project(test_project_name)
          .upload('test/test.csv')
          .delete()
      )
    })
  })
})
