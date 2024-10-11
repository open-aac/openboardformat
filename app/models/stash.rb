class Stash < ApplicationRecord
  serialize :data, JSON
  before_save :generate_defaults

  def generate_defaults
    self.data ||= {}
  end
end
