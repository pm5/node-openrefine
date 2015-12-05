'use strict'

var chai = require('chai')
var chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
var expect = chai.expect
var OpenRefine = require('../').OpenRefine
var fs = require('fs')
var csv = require('csv')

describe('OpenRefine', () => {
  var test_project_name = 'dont_use_this_name'
  //var test_project_name = 'abc'

  describe('server', () => {
    describe('get projects metadata', () => {
      var projects_data
      before(() =>
        OpenRefine()
          .projects()
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

    describe('create projects', () => {
      it('should create projects by name', () => {
        var p = OpenRefine().create(test_project_name)
        expect(p.id()).to.be.undefined
      })

      it('should create projects without a name', () => {
        var p = OpenRefine().create()
        expect(p.name()).to.exist
      })
    })

    describe('load projects', () => {
      var id
      before(() =>
        OpenRefine()
          .create(test_project_name)
          .load('test/test.csv')
      )

      it('should load projects by id', () =>
        OpenRefine()
          .load(id)
      )
    })

    describe('delete projects', () => {
      var id
      before(() =>
        OpenRefine()
          .create(test_project_name)
          .load('test/test.csv')
      )
      after(() => OpenRefine().delete(id))

      it('should delete projects', () =>
        OpenRefine()
          .delete(id)
          .then(() => OpenRefine().projects())
          .then(data => {
            expect(data).to.not.have.property(id)
          })
      )
    })
  })

  describe('project', () => {
    after(() =>
      OpenRefine()
        .projects()
        .then(data =>
          Object.keys(data.projects)
            .filter(id => data.projects[id].name === test_project_name)
        )
        .then(ids => ids.forEach(OpenRefine().delete))
    )

    describe('load data', () => {
      it('should load the data and output at end', () =>
        expect(
          OpenRefine()
            .create(test_project_name)
            .load('test/test.csv')
            .end()
          ).to.eventually.be.ok
      )
    })

    describe('data format', () => {

      describe('in objects', () => {
        it('should expose data in array of objects', () =>
          expect(
            OpenRefine()
              .create(test_project_name)
              .load('test/test.csv')
              .end()
            ).to.eventually.eql([
              {Date: '2018-11-13', Number: '123'},
              {Date: '2018-11-14', Number: '45671'},
              {Date: '2018-11-15', Number: '991'},
              {Date: '2018-11-16', Number: '3025'},
              {Date: '2018-11-17', Number: '104234'},
            ])
        )
      })

      describe('in CSV', () => {
        it('should expose data in CSV', () =>
          expect(
            OpenRefine()
              .create(test_project_name)
              .expose('csv')
              .load('test/test.csv')
              .end(data => data)
            ).to.eventually.match(/^Date,Number\n/)
        )
      })

      describe('in TSV', () => {
        it('should expose data in TSV', () =>
          expect(
            OpenRefine()
              .create(test_project_name)
              .expose('tsv')
              .load('test/test.csv')
              .end()
            ).to.eventually.match(/^Date\tNumber\n/)
        )
      })
    })

    describe('apply operations', () => {
      it('should apply operations to project', () =>
        //expect(
          //OpenRefine()
            //.create(test_project_name)
            //.use(JSON.parse(fs.readFileSync('test/op.json')))
            //.load('test/test.csv')
            //.end()
          //).to.eventually.eql([
          //])
        true
      )
    })

    describe('destroy project', () => {
    })

    //describe('pipe data in', () => {
      //it('should pipe data into stream', () => {
        //var sin = OpenRefine()
          //.create(test_project_name)
        //fs.createReadStream('test/test.csv')
          //.pipe(sin)
          //.export()
          //.then(text => expect(text).to.equal('日期,人數\n2018-11-13,123\n2018-11-14,45671\n2018-11-15,991\n2018-11-16,3025\n2018-11-17,104234\n'))
      //})
    //})

    //describe('pipe data out', () => {
      //it('should pipe data out of stream', () => {
        //var sout = OpenRefine()
          //.create(test_project_name)
          //.upload('test/test.csv')
          //.pipe(csv.parse())
          //.pipe(csv.transform(rec => {
            //try {
              //rec[0] = rec[0].replace(/-/g, '/')
            //} catch (e) { [> ignore <] }
            //return rec
          //}))
          //.pipe(csv.stringify())
        //sout.setEncoding('utf-8')
        //var output = ''
        //sout.on('data', chunk => output += chunk)
        //return new Promise(resolve => {
          //sout.on('end', () => {
            //expect(output).to.equal('日期,人數\n2018/11/13,123\n2018/11/14,45671\n2018/11/15,991\n2018/11/16,3025\n2018/11/17,104234\n')
            //resolve()
          //})
        //})
      //})
    //})
  })
})
