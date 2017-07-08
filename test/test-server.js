const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {DATABASE_URL} = require('../config');
const {TEST_DATABASE_URL}=require('../config');

const should = chai.should();

chai.use(chaiHttp);

function seedPostData() {
	console.info('seeding restaurant data');
	const seedData = [];

	for (let i=1; i<=10; i++) {
		seedData.push({
		author: {firstName: faker.name.firstName(), lastName: faker.name.lastName()},
		title: faker.company.catchPhrase(),
		content: faker.lorem.sentences(),
	});
	}
	return BlogPost.insertMany(seedData);
}


function tearDownDb() {

	return new Promise((resolve, reject) => {
		console.warn('Deleting database');
		mongoose.connection.dropDatabase()
			.then(result => resolve(result))
			.catch(err => reject(err))
	});
}

describe('posts', function(){

	before(function(){
		return runServer(TEST_DATABASE_URL);
	});

	beforeEach(function() {
		return seedPostData();
	})

	after(function(){
		return closeServer();
	});

	afterEach(function() {
		return tearDownDb();
	});

	describe('GET ENDPOINT', function() {
		it('should return all existing posts', function() {
			let res;
			return chai.request(app)
				.get('/posts')
				.then(function(_res){
					res = _res;
					res.should.have.status(200);
					res.body.should.have.length.of.at.least(1);
					return BlogPost.count();
				})
				.then(function(count){
					res.body.should.have.length.of(count);
				});
		});

		it('should return posts with the right fields', function(){
			let resPosts;
			return chai.request(app)
				.get('/posts')
				.then(function(res){
					res.should.have.status(200);
					res.should.be.json;
					res.body.should.be.a('array');
					res.body.should.have.length.of.at.least(1);

					res.body.forEach(function(post){
						post.should.be.a('object');
						post.should.include.keys(
							'title', 'author', 'content', 'created', 'id');
					});
					resPosts = res.body[0];
					return BlogPost.findById(resPosts.id).exec();
				})
				.then(function(posts){
					resPosts.id.should.equal(posts.id);
					resPosts.title.should.equal(posts.title);
					resPosts.content.should.equal(posts.content);
					resPosts.author.should.equal(posts.authorName);
				});
		});
	});

	describe('POST ENDPOINT', function() {
		it('should add a new restaurant', function() {
			const newPost = {
								author: {firstName: faker.name.firstName(), lastName: faker.name.lastName()},
								title: faker.company.catchPhrase(),
								content: faker.lorem.sentences(),
							}

			return chai.request(app)
				.post('/posts')
				.send(newPost)
				.then(function(res){
					res.should.have.status(201);
					res.should.be.json;
					res.body.should.be.a('object');
					res.body.should.include.keys(
						'title', 'author', 'content', 'created', 'id');
					res.body.id.should.not.be.null;
					res.body.title.should.equal(newPost.title);
					res.body.author.should.equal(
						`${newPost.author.firstName} ${newPost.author.lastName}`);
					res.body.content.should.equal(newPost.content);
					return BlogPost.findById(res.body.id);
				})
				.then(function(post){
					post.id.should.not.be.null;
					post.title.should.equal(newPost.title);
					post.author.firstName.should.equal(newPost.author.firstName);
					post.author.lastName.should.equal(newPost.author.lastName);
					post.content.should.equal(newPost.content);
				});
		});
	});

	describe('PUT ENDPOINT', function() {

		it('should update the fields you send over', function() {
			const updatedData = {
				title: 'Gone With The Wind',
				author: 'Someone else'
			};

			return BlogPost
				.findOne()
				.exec()
				.then(function(post) {
					updatedData.id = post.id;
					return chai.request(app)
						.put(`/posts/${post.id}`)
						.send(updatedData);
				})
				.then(function(res) {
					res.should.have.status(201);

					return BlogPost.findById(updatedData.id).exec();
				})
				then(function(post) {
					post.title.should.equal(updatedData.title);
					post.author.should.equal(updatedData.author);
				});
		});
	});

	describe('DELETE ENDPOINT', function() {

		it('should delete a post', function() {

			let post;

			return BlogPost
				.findOne()
				.exec()
				.then(function(_post) {
					post = _post;
					return chai.request(app).delete(`/posts/${post.id}`);
				})
				.then(function(res) {
					res.should.have.status(204);
					return BlogPost.findById(post.id);
				})
				.then(function(_post){
					should.not.exist(_post);
				});
		});
	});
});