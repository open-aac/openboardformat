class DocsController < ApplicationController
  def index
    render :index
  end
  # home page, any additional documentation (prolly all in ember)
  # TODO: disqus or something on some of the pages??

  def word_list
    compset = AACMetrics::Loader.retrieve(params['list'])
    data = AACMetrics::Metrics.analyze(compset)
    render plain: data[:buttons].map{|b| b[:label] }.compact.uniq.join("\n")
  end
end
