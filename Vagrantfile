VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|

  config.vm.define "precise64" do |precise64|
    precise64.vm.network "private_network", ip: "192.168.50.2"
    precise64.vm.box = "precise64"
  end

  config.vm.define "debian64" do |debian64|
    debian64.vm.network "private_network", ip: "192.168.50.3"
    debian64.vm.box = "chef/debian-7.4"
  end

  config.vm.define "centos64" do |centos64|
    centos64.vm.network "private_network", ip: "192.168.50.5"
    centos64.vm.box = "chef/centos-6.5"
  end

end
