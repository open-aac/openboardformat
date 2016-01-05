source 'https://rubygems.org'

group :development, :test do
  gem 'dotenv'
#  gem 'jasminerice', :git => 'https://github.com/bradphelan/jasminerice.git'
#  gem 'guard'
#  gem 'guard-jasmine'
#  gem 'guard-rspec'
  gem 'rspec-rails'
  gem 'simplecov', :require => false
  gem 'sqlite3'
#  gem 'debugger'
end

group :production do
  gem 'pg'
end

gem 'rails', '4.1.0'
gem 'typhoeus'
gem 'sass-rails', '~> 4.0.3'
gem 'uglifier', '>= 1.3.0'
gem 'resque'
gem 'rails_12factor', group: :production
gem 'heroku-deflater', :group => :production
gem 'obf'

# Spring speeds up development by keeping your application running in the background. Read more: https://github.com/rails/spring
# gem 'spring',        group: :development

# Use unicorn as the app server
gem 'unicorn'

ruby "2.3.0"