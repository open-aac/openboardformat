require 'converter'

class ConversionsController < ApplicationController
  skip_before_action :verify_authenticity_token
  # internal api for getting S3 upload paramaters, checking status, and performing conversion
  def upload_params
    # TODO: some kind of throttling or captcha or something to prevent abuse
    res = Converter.remote_upload_params(params['filename'], params['content_type'])
    render json: res
  end
  
  def convert
    p = Progress.schedule(Converter, :convert_file, params['url'], params['type'])
    render json: p.status
  end
  
  def validate
    p = Progress.schedule(Converter, :validate_file, params['url'], params['type'])
    render json: p.status
  end

  def obfset
    p = Progress.schedule(Converter, :generate_obfset, params['url'], params['type'])
    render json: p.status
  end

  def analyze
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    p = Progress.schedule(Converter, :analyze_obfset, params['url'], params['comp'])
    render json: p.status
  end
  
  def analyze_preflight
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    render json: {ok: true}
  end

  def status
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    p = Progress.find_by_code(params['code'])
    if p
      render json: p.status
    else
      render json: {error: "not found"}, :status => 400
    end
  end
end
