Rails.application.routes.draw do
  require 'resque/server'
  ember_handler = 'docs#index'
  root ember_handler
  get '/docs' => ember_handler
  get '/logs' => ember_handler
  get '/examples' => ember_handler
  get '/tools' => ember_handler
  get '/analyze' => ember_handler
  get '/analysis' => ember_handler
  get '/share' => ember_handler
  get '/partners' => ember_handler
  get '/words' => 'docs#word_list'
  
  post '/converter/upload_params' => 'conversions#upload_params'
  post '/converter/convert' => 'conversions#convert'
  post '/converter/obfset' => 'conversions#obfset'
  post '/converter/analyze' => 'conversions#analyze'
  post '/converter/validate' => 'conversions#validate'
  get '/converter/status' => 'conversions#status'

  protected_resque = Rack::Auth::Basic.new(Resque::Server.new) do |username, password|
    username == 'admin' && password == (ENV['RESQUE_PASSWORD'] || 'password')
  end
  mount protected_resque, :at => "/resque"

end
