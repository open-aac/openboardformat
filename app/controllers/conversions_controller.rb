require 'converter'

class ConversionsController < ApplicationController
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
  
  def status
    p = Progress.find_by_code(params['code'])
    if p
      render json: p.status
    else
      render json: {error: "not found"}, :status => 400
    end
  end
end
